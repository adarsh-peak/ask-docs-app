import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Spinner, TextField, IconButton, Tooltip } from '@radix-ui/themes'
import { FolderTree } from './FolderTree'
import { DocViewer } from './DocViewer'
import { fetchDocs, fetchAllFiles, searchFiles } from '../api/docs'
import { buildFileTree } from '../utils/buildTree'
import type { DocMeta, TreeNode, TreeFile, FileSearchHit, FileSearchResponse } from '../types'
import './FilesView.css'

function FileDocIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ flexShrink: 0, opacity: 0.5 }}>
      <path d="M2 1.5A.5.5 0 0 1 2.5 1h5.293a.5.5 0 0 1 .353.146l1.708 1.708a.5.5 0 0 1 .146.353V10.5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-9z"/>
    </svg>
  )
}

function FileGenericIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.4 }}>
      <path d="M2 1.5A.5.5 0 0 1 2.5 1h5.293a.5.5 0 0 1 .353.146l1.708 1.708a.5.5 0 0 1 .146.353V10.5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-9z"/>
    </svg>
  )
}

function PanelToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2" width="10" height="9" rx="1.5" />
      <path d="M5 2v9" />
      {collapsed ? <path d="M7 5l2 1.5L7 8" /> : <path d="M9 5l-2 1.5L9 8" />}
    </svg>
  )
}

type SearchSectionId = 'fuzzy' | 'semantic'

interface SearchRow extends TreeFile {
  id: string
  section: SearchSectionId
  rankScore: number
}

const EMPTY_SEARCH_RESPONSE: FileSearchResponse = { fuzzy: [], semantic: [] }

function fileName(path: string): string {
  return path.split('/').pop() ?? path
}

function fileStem(name: string): string {
  return name.replace(/\.[^/.]+$/, '')
}

function normalized(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function nameMatchScore(candidate: string | null | undefined, query: string): number {
  const value = normalized(candidate)
  if (!value || !query) return 0
  if (value === query) return 10000
  if (value.startsWith(query)) return 9000
  if (value.includes(query)) return 8000
  return 0
}

function metadataMatchScore(values: Array<string | null | undefined>, query: string): number {
  let score = 0
  for (const raw of values) {
    const value = normalized(raw)
    if (!value || !query) continue
    if (value === query) score = Math.max(score, 5000)
    else if (value.startsWith(query)) score = Math.max(score, 4700)
    else if (value.includes(query)) score = Math.max(score, 4400)
  }
  return score
}

function localMatchScore(path: string, metaMap: Record<string, DocMeta>, query: string): number {
  const meta = metaMap[path]
  const name = fileName(path)
  const stem = fileStem(name)
  const project = projectFromPath(path)
  const nameScore = Math.max(
    nameMatchScore(name, query),
    nameMatchScore(stem, query),
    nameMatchScore(meta?.title, query)
  )
  if (nameScore > 0) return nameScore

  const metadataScore = metadataMatchScore([project, ...(meta?.tags ?? [])], query)
  if (metadataScore > 0) return metadataScore

  return normalized(path).includes(query) ? 3000 : 0
}

function contentMatchScore(hit: FileSearchHit): number {
  const rawScore = Number.isFinite(hit.score) ? hit.score : 0
  const matchedChunks = hit.matched_chunks ?? 1
  const exactMatches = hit.exact_matches ?? 0
  const headingMatches = hit.heading_matches ?? 0
  if (headingMatches > 0) {
    return 7600 + Math.min(headingMatches, 10) * 25 + Math.min(exactMatches, 20) * 10
  }
  if (exactMatches > 0) {
    return 6500 + Math.min(exactMatches, 20) * 35 + Math.min(matchedChunks, 20) * 5
  }
  return Math.min(3900, 1000 + rawScore * 120 + Math.min(matchedChunks, 20) * 45)
}

function rankHit(hit: FileSearchHit, metaMap: Record<string, DocMeta>, query: string): number {
  const localScore = localMatchScore(hit.path, metaMap, query)
  const contentScore = contentMatchScore(hit)
  return localScore > 0 ? localScore + Math.min(contentScore, 500) : contentScore
}

function compareSearchRows(a: SearchRow, b: SearchRow): number {
  if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore
  return (a.title ?? a.name).localeCompare(b.title ?? b.name)
}

function rowFromPath(path: string, metaMap: Record<string, DocMeta>, query: string): SearchRow {
  const meta = metaMap[path]
  return {
    id: `fuzzy:${path}`,
    kind: 'file',
    name: fileName(path),
    path,
    title: meta?.title ?? null,
    tags: meta?.tags ?? [],
    section: 'fuzzy',
    rankScore: localMatchScore(path, metaMap, query),
  }
}

function rowFromHit(
  hit: FileSearchHit,
  section: SearchSectionId,
  metaMap: Record<string, DocMeta>,
  query: string
): SearchRow {
  const meta = metaMap[hit.path]
  return {
    id: `${section}:${hit.path}`,
    kind: 'file',
    name: fileName(hit.path),
    path: hit.path,
    title: hit.title ?? meta?.title ?? null,
    tags: hit.tags.length ? hit.tags : meta?.tags ?? [],
    section,
    rankScore: section === 'fuzzy'
      ? rankHit(hit, metaMap, query)
      : hit.score,
  }
}

function mergeRows(primary: SearchRow[], fallback: SearchRow[]): SearchRow[] {
  const seen = new Set<string>()
  const rows: SearchRow[] = []
  for (const row of [...primary, ...fallback]) {
    if (seen.has(row.path)) continue
    seen.add(row.path)
    rows.push(row)
  }
  return rows
}

function formatSearchErrors(errors: FileSearchResponse['errors']): string | null {
  const modes = Object.keys(errors ?? {}) as SearchSectionId[]
  if (modes.length === 0) return null
  if (modes.length > 1) return 'Content search unavailable.'
  return `${modes[0] === 'semantic' ? 'Semantic' : 'Fuzzy'} search unavailable.`
}

function projectFromPath(path: string): string {
  const [project] = path.split('/')
  return project || 'root'
}

export function FilesView() {
  const [allFiles, setAllFiles] = useState<string[]>([])
  const [docs, setDocs] = useState<DocMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(
    () => localStorage.getItem('filesView:selectedPath')
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem('filesView:sidebarCollapsed') === '1'
  )
  const [search, setSearch] = useState('')
  const [contentSearch, setContentSearch] = useState<FileSearchResponse>(EMPTY_SEARCH_RESPONSE)
  const [contentSearchLoading, setContentSearchLoading] = useState(false)
  const [contentSearchError, setContentSearchError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const searchRef = useRef<HTMLInputElement>(null)
  const location = useLocation()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([fetchAllFiles(), fetchDocs()])
      .then(([files, d]) => {
        if (cancelled) return
        setAllFiles(files)
        setDocs(d)
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (selectedPath) localStorage.setItem('filesView:selectedPath', selectedPath)
    else localStorage.removeItem('filesView:selectedPath')
  }, [selectedPath])

  useEffect(() => {
    localStorage.setItem('filesView:sidebarCollapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  function toggleSidebar() {
    setSidebarCollapsed(prev => !prev)
  }

  // Support graph view clicking a doc node → navigate here with state
  useEffect(() => {
    const openPath = (location.state as { openPath?: string } | null)?.openPath
    if (openPath) setSelectedPath(openPath)
  }, [location.state])

  useEffect(() => {
    if (!loading && selectedPath && !allFiles.includes(selectedPath)) {
      setSelectedPath(null)
    }
  }, [allFiles, loading, selectedPath])

  function handleDelete(deletedPath: string) {
    setAllFiles(prev => prev.filter(p => p !== deletedPath))
    setDocs(prev => prev.filter(d => d.path !== deletedPath))
    setSelectedPath(null)
  }

  const metaMap: Record<string, DocMeta> = Object.fromEntries(docs.map(d => [d.path, d]))
  const tree: TreeNode[] = buildFileTree(allFiles, metaMap)
  const indexedCount = docs.length
  const previewOnlyCount = Math.max(0, allFiles.length - indexedCount)
  const selectedMeta = selectedPath ? metaMap[selectedPath] ?? null : null

  const rawQuery = search.trim()
  const query = rawQuery.toLowerCase()
  const canSearchContent = rawQuery.length >= 2
  const localFuzzyRows: SearchRow[] = query === ''
    ? []
    : allFiles
        .filter(path => {
          const meta = metaMap[path]
          const name = fileName(path)
          return (
            path.toLowerCase().includes(query) ||
            name.toLowerCase().includes(query) ||
            (meta?.title ?? '').toLowerCase().includes(query) ||
            (meta?.tags ?? []).some(t => t.toLowerCase().includes(query))
          )
        })
        .map(path => rowFromPath(path, metaMap, query))
        .filter(row => row.rankScore > 0)
  const fuzzyRows = mergeRows(
    contentSearch.fuzzy.map(hit => rowFromHit(hit, 'fuzzy', metaMap, query)),
    localFuzzyRows
  ).sort(compareSearchRows)
  const semanticRows = contentSearch.semantic.map(hit => rowFromHit(hit, 'semantic', metaMap, query))
  const searchSections: Array<{ id: SearchSectionId; label: string; rows: SearchRow[] }> = query === ''
    ? []
    : [
        { id: 'fuzzy', label: 'Fuzzy', rows: fuzzyRows },
        ...(canSearchContent ? [{ id: 'semantic' as const, label: 'Semantic', rows: semanticRows }] : []),
      ]
  const searchRows = searchSections.flatMap(section => section.rows)

  useEffect(() => {
    if (!canSearchContent) {
      setContentSearch(EMPTY_SEARCH_RESPONSE)
      setContentSearchLoading(false)
      setContentSearchError(null)
      return
    }

    const controller = new AbortController()
    let cancelled = false
    setContentSearchLoading(true)
    setContentSearchError(null)
    setContentSearch(EMPTY_SEARCH_RESPONSE)

    const timeout = window.setTimeout(() => {
      searchFiles(rawQuery, controller.signal)
        .then(result => {
          if (cancelled) return
          setContentSearch(result)
          setContentSearchError(formatSearchErrors(result.errors))
        })
        .catch(e => {
          if (cancelled || (e instanceof DOMException && e.name === 'AbortError')) return
          setContentSearch(EMPTY_SEARCH_RESPONSE)
          setContentSearchError(e instanceof Error ? e.message : String(e))
        })
        .finally(() => {
          if (!cancelled) setContentSearchLoading(false)
        })
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [canSearchContent, rawQuery])

  // Reset the keyboard highlight to the top whenever the query changes
  useEffect(() => { setActiveIndex(0) }, [query])

  useEffect(() => {
    setActiveIndex(i => Math.min(i, Math.max(searchRows.length - 1, 0)))
  }, [searchRows.length])

  // Keep the highlighted result scrolled into view as arrows move it
  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  useEffect(() => {
    itemRefs.current.length = searchRows.length
  }, [searchRows.length])

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && search) {
      e.preventDefault()
      setSearch('')
      return
    }
    if (searchRows.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, searchRows.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const file = searchRows[activeIndex]
      if (file) setSelectedPath(file.path)
    }
  }

  return (
    <div className="files-layout">
      {/* Left: folder tree */}
      <div className={`files-sidebar${sidebarCollapsed ? ' files-sidebar--collapsed' : ''}`}>
        <div className="files-sidebar-header">
          <div className="files-sidebar-header-row">
            <Tooltip content={sidebarCollapsed ? 'Show file list' : 'Hide file list'} side="right">
              <IconButton
                size="1" variant="ghost" color="gray"
                onClick={toggleSidebar}
                aria-label={sidebarCollapsed ? 'Show file list' : 'Hide file list'}
              >
                <PanelToggleIcon collapsed={sidebarCollapsed} />
              </IconButton>
            </Tooltip>
            {!sidebarCollapsed && (loading ? (
              <Spinner size="1" />
            ) : (
              <p className="files-sidebar-kicker">
                {loadError
                  ? 'Files unavailable'
                  : query
                    ? `${searchRows.length} search results${contentSearchLoading ? ' / searching' : ''}`
                    : `${allFiles.length} files / ${indexedCount} indexed${previewOnlyCount ? ` / ${previewOnlyCount} preview` : ''}`}
              </p>
            ))}
          </div>
          {!sidebarCollapsed && !loading && !loadError && (
            <TextField.Root
              size="1"
              placeholder="Search files and content…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              ref={searchRef}
            >
              <TextField.Slot>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="5" cy="5" r="3.5"/>
                  <path d="M8.5 8.5 11 11"/>
                </svg>
              </TextField.Slot>
              {search && (
                <TextField.Slot side="right">
                  <IconButton
                    size="1" variant="ghost" color="gray"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M2 2l6 6M8 2l-6 6"/>
                    </svg>
                  </IconButton>
                </TextField.Slot>
              )}
            </TextField.Root>
          )}
        </div>
        {!sidebarCollapsed && !loading && loadError && (
          <p className="files-route-message">
            Could not load files. {loadError}
          </p>
        )}
        {!sidebarCollapsed && !loading && !loadError && allFiles.length === 0 && (
          <p className="files-route-message">No supported files found.</p>
        )}
        {!sidebarCollapsed && !loading && !loadError && allFiles.length > 0 && (
          query ? (
            <div className="files-tree-scroll files-search-results">
              {contentSearchError && (
                <p className="files-route-message files-route-message--compact">
                  {contentSearchError}
                </p>
              )}
              {searchSections.map(section => (
                <section className="files-search-section" key={section.id}>
                  <div className="files-search-section-header">
                    <span>{section.label}</span>
                    <span className="files-search-section-count">{section.rows.length}</span>
                    {contentSearchLoading && canSearchContent && <Spinner size="1" />}
                  </div>
                  {section.rows.length === 0 ? (
                    <p className="files-route-message files-route-message--compact">
                      {contentSearchLoading && canSearchContent ? 'Searching…' : 'No matches.'}
                    </p>
                  ) : section.rows.map(file => {
                    const idx = searchRows.indexOf(file)
                    const isSelected = file.path === selectedPath
                    const isActive = idx === activeIndex
                    const project = projectFromPath(file.path)
                    return (
                      <Tooltip key={file.id} content={file.path} side="right" delayDuration={600}>
                        <button
                          ref={el => { if (idx >= 0) itemRefs.current[idx] = el }}
                          className={
                            `file-tree-button file-tree-button--file file-search-row` +
                            `${isSelected ? ' file-tree-button--selected' : ''}` +
                            `${isActive && !isSelected ? ' file-tree-button--active' : ''}`
                          }
                          onClick={() => { setSelectedPath(file.path); setActiveIndex(idx) }}
                          onMouseEnter={() => setActiveIndex(idx)}
                        >
                          {file.name.toLowerCase().endsWith('.md') ? <FileDocIcon /> : <FileGenericIcon />}
                          <span className="file-search-body">
                            <span className="file-search-title-row">
                              <span className="file-search-title">{file.title ?? file.name}</span>
                              <span className="files-pill files-pill--project">{project}</span>
                            </span>
                          </span>
                        </button>
                      </Tooltip>
                    )
                  })}
                </section>
              ))}
            </div>
          ) : (
            <FolderTree
              nodes={tree}
              selectedPath={selectedPath}
              onSelectFile={setSelectedPath}
            />
          )
        )}
      </div>

      {/* Right: doc content */}
      <div className="files-content">
        <DocViewer
          path={selectedPath}
          meta={selectedMeta}
          onDelete={handleDelete}
          allFiles={allFiles}
          onNavigate={setSelectedPath}
        />
      </div>
    </div>
  )
}
