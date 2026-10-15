import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Spinner, Tooltip } from '@radix-ui/themes'
import { fetchActivity, fetchAllFiles } from '../api/docs'
import type { ActivityDay, FileEntry } from '../types'
import './HomeView.css'

const RECENT_FILES_COUNT = 10

const WEEKS = 53
const DAYS_PER_WEEK = 7
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  if (count <= 10) return 3
  return 4
}

interface Cell {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
  inRange: boolean
}

function buildGrid(activity: ActivityDay[]): { weeks: Cell[][]; monthMarkers: Array<{ week: number; label: string }> } {
  const counts = new Map(activity.map(a => [a.date, a.count]))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(end.getDate() + (6 - end.getDay())) // extend to end of this week (Saturday)
  const start = new Date(end)
  start.setDate(start.getDate() - (WEEKS * DAYS_PER_WEEK - 1))

  const weeks: Cell[][] = []
  const monthMarkers: Array<{ week: number; label: string }> = []
  let lastMonth = -1
  const cursor = new Date(start)

  for (let w = 0; w < WEEKS; w++) {
    const week: Cell[] = []
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const key = toDateKey(cursor)
      const inRange = cursor <= today
      const count = counts.get(key) ?? 0
      if (d === 0 && cursor.getMonth() !== lastMonth) {
        lastMonth = cursor.getMonth()
        monthMarkers.push({ week: w, label: MONTH_LABELS[lastMonth] })
      }
      week.push({ date: key, count, level: levelFor(count), inRange })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  return { weeks, monthMarkers }
}

function formatDateLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function fileName(path: string): string {
  return path.split('/').pop() ?? path
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.round(months / 12)}y ago`
}

export function HomeView() {
  const navigate = useNavigate()
  const [activity, setActivity] = useState<ActivityDay[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recentFiles, setRecentFiles] = useState<FileEntry[] | null>(null)
  const [recentError, setRecentError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchActivity()
      .then(a => { if (!cancelled) setActivity(a) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchAllFiles()
      .then(files => {
        if (cancelled) return
        const filtered = files.filter(f => !f.path.split('/').includes('_tags'))
        const sorted = [...filtered].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
        setRecentFiles(sorted.slice(0, RECENT_FILES_COUNT))
      })
      .catch(e => { if (!cancelled) setRecentError(e instanceof Error ? e.message : String(e)) })
    return () => { cancelled = true }
  }, [])

  const { weeks, monthMarkers } = useMemo(() => buildGrid(activity ?? []), [activity])

  const totalEdits = useMemo(
    () => weeks.flat().filter(c => c.inRange).reduce((sum, c) => sum + c.count, 0),
    [weeks]
  )
  const activeDays = useMemo(
    () => weeks.flat().filter(c => c.inRange && c.count > 0).length,
    [weeks]
  )

  return (
    <div className="home-layout">
      <div className="home-activity">
      <div className="home-hero">
        <h1 className="home-title">Docs activity</h1>
        <p className="home-subtitle">
          File edits across your vault over the last year, by last-modified date.
        </p>
      </div>

      {error && <p className="home-error">Could not load activity. {error}</p>}

      {!error && !activity && (
        <div className="home-loading"><Spinner size="2" /></div>
      )}

      {!error && activity && (
        <div className="home-card">
          <div className="home-card-header">
            <span className="home-card-stat">{totalEdits} edits</span>
            <span className="home-card-stat-sep">/</span>
            <span className="home-card-stat">{activeDays} active days</span>
            <span className="home-card-stat-sep">in the last year</span>
          </div>

          <div className="home-heatmap-scroll">
            <div className="home-heatmap">
              <div className="home-heatmap-months">
                {monthMarkers.map((m, i) => (
                  <span
                    key={`${m.label}-${i}`}
                    className="home-heatmap-month"
                    style={{ gridColumnStart: m.week + 1 }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
              <div className="home-heatmap-grid">
                {weeks.map((week, wi) => (
                  <div className="home-heatmap-col" key={wi}>
                    {week.map(cell => (
                      <Tooltip
                        key={cell.date}
                        content={cell.inRange ? `${cell.count} edit${cell.count === 1 ? '' : 's'} on ${formatDateLabel(cell.date)}` : ''}
                      >
                        <div
                          className={`home-heatmap-cell${cell.inRange ? '' : ' home-heatmap-cell--future'}`}
                          data-level={cell.inRange ? cell.level : undefined}
                        />
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="home-heatmap-legend">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div key={level} className="home-heatmap-cell" data-level={level} />
            ))}
            <span>More</span>
          </div>
        </div>
      )}

      {!recentError && recentFiles && recentFiles.length > 0 && (
        <div className="home-card home-recent-card">
          <div className="home-card-header">
            <span className="home-card-stat">Recently updated</span>
          </div>
          <ul className="home-recent-list">
            {recentFiles.map(file => (
              <li key={file.path}>
                <button
                  type="button"
                  className="home-recent-item"
                  onClick={() => navigate('/files', { state: { openPath: file.path } })}
                >
                  <span className="home-recent-name">{fileName(file.path)}</span>
                  <span className="home-recent-path">{file.path}</span>
                  <span className="home-recent-time">{formatRelativeTime(file.updated_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {recentError && <p className="home-error">Could not load recent files. {recentError}</p>}
      <section className="home-walkthrough-teaser" aria-labelledby="home-walkthrough-title">
        <div>
          <h2 id="home-walkthrough-title">How Ask Docs works</h2>
          <p>Follow a document from Markdown to a cited answer.</p>
        </div>
        <Link to="/how-it-works" className="home-walkthrough-link">Explore the 3D walkthrough</Link>
      </section>
      </div>
    </div>
  )
}
