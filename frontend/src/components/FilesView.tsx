import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { Spinner, TextField, IconButton, Tooltip, Select } from '@radix-ui/themes'
import { FolderTree } from './FolderTree'
import { DocViewer } from './DocViewer'
import { fetchDocs, fetchAllFiles, searchFiles } from '../api/docs'
import { buildFileTree, flattenTreeFiles } from '../utils/buildTree'
import type { DocMeta, TreeNode, TreeFile, FileEntry, FileSearchHit, FileSearchResponse } from '../types'
import './FilesView.css'

type UpdatedFilter = 'all' | '1' | '7' | '30' | '90'

const UPDATED_FILTER_OPTIONS: Array<{ value: UpdatedFilter; label: string }> = [
  { value: 'all', label: 'Any time' },
  { value: '1', label: 'Today' },
  { value: '7', label: 'Past 7 days' },
  { value: '30', label: 'Past 30 days' },
  { value: '90', label: 'Past 90 days' },
]

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

interface SearchRow extends TreeFile {
  id: string
  rankScore: number
}

const EMPTY_SEARCH_RESPONSE: FileSearchResponse = { fuzzy: [] }

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
    rankScore: localMatchScore(path, metaMap, query),
  }
}

function rowFromHit(
  hit: FileSearchHit,
  metaMap: Record<string, DocMeta>,
  query: string
): SearchRow {
  const meta = metaMap[hit.path]
  return {
    id: `fuzzy:${hit.path}`,
    kind: 'file',
    name: fileName(hit.path),
    path: hit.path,
    title: hit.title ?? meta?.title ?? null,
    tags: hit.tags.length ? hit.tags : meta?.tags ?? [],
    rankScore: rankHit(hit, metaMap, query),
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
  return errors?.fuzzy ? 'Content search unavailable.' : null
}

function projectFromPath(path: string): string {
  const [project] = path.split('/')
  return project || 'root'
}

export function FilesView() {
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([])
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
  const [filterProject, setFilterProject] = useState<string>(
    () => localStorage.getItem('filesView:filterProject') ?? 'all'
  )
  const [filterUpdated, setFilterUpdated] = useState<UpdatedFilter>(
    () => (localStorage.getItem('filesView:filterUpdated') as UpdatedFilter | null) ?? 'all'
  )
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
        setFileEntries(files)
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

  useEffect(() => {
    localStorage.setItem('filesView:filterProject', filterProject)
  }, [filterProject])

  useEffect(() => {
    localStorage.setItem('filesView:filterUpdated', filterUpdated)
  }, [filterUpdated])

  function toggleSidebar() {
    setSidebarCollapsed(prev => !prev)
  }

  // Support graph view clicking a doc node → navigate here with state
  useEffect(() => {
    const openPath = (location.state as { openPath?: string } | null)?.openPath
    if (openPath) setSelectedPath(openPath)
  }, [location.state])

  const allFiles = useMemo(() => fileEntries.map(f => f.path), [fileEntries])

  useEffect(() => {
    if (!loading && selectedPath && !allFiles.includes(selectedPath)) {
      setSelectedPath(null)
    }
  }, [allFiles, loading, selectedPath])

  function handleDelete(deletedPath: string) {
    setFileEntries(prev => prev.filter(f => f.path !== deletedPath))
    setDocs(prev => prev.filter(d => d.path !== deletedPath))
    setSelectedPath(null)
  }

  function handleSaved(savedPath: string) {
    setFileEntries(prev =>
      prev.map(f => (f.path === savedPath ? { ...f, updated_at: new Date().toISOString() } : f))
    )
    fetchDocs()
      .then(setDocs)
      .catch(() => {})
  }

  const updatedAtByPath = useMemo(
    () => Object.fromEntries(fileEntries.map(f => [f.path, f.updated_at])),
    [fileEntries]
  )
  const projectOptions = useMemo(
    () => Array.from(new Set(allFiles.map(projectFromPath))).sort(),
    [allFiles]
  )
  const matchesFilters = useMemo(() => {
    const maxAgeDays = filterUpdated === 'all' ? null : Number(filterUpdated)
    return (path: string): boolean => {
      if (filterProject !== 'all' && projectFromPath(path) !== filterProject) return false
      if (maxAgeDays !== null) {
        const updatedAt = updatedAtByPath[path]
        if (!updatedAt) return false
        const ageDays = (Date.now() - new Date(updatedAt).getTime()) / 86_400_000
        if (ageDays > maxAgeDays) return false
      }
      return true
    }
  }, [filterProject, filterUpdated, updatedAtByPath])
  const filtersActive = filterProject !== 'all' || filterUpdated !== 'all'
  const filteredFiles = useMemo(
    () => (filtersActive ? allFiles.filter(matchesFilters) : allFiles),
    [allFiles, filtersActive, matchesFilters]
  )

  const metaMap: Record<string, DocMeta> = Object.fromEntries(docs.map(d => [d.path, d]))
  const tree: TreeNode[] = buildFileTree(filteredFiles, metaMap)
  const indexedCount = docs.length
  const previewOnlyCount = Math.max(0, allFiles.length - indexedCount)
  const selectedMeta = selectedPath ? metaMap[selectedPath] ?? null : null

  // Left/Right arrows step through files in the same order shown in the sidebar tree.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const flatFiles = flattenTreeFiles(tree)
      if (flatFiles.length === 0) return
      const currentIndex = selectedPath ? flatFiles.indexOf(selectedPath) : -1
      let nextIndex: number
      if (currentIndex === -1) {
        nextIndex = 0
      } else if (e.key === 'ArrowRight') {
        nextIndex = Math.min(currentIndex + 1, flatFiles.length - 1)
      } else {
        nextIndex = Math.max(currentIndex - 1, 0)
      }
      if (nextIndex === currentIndex) return
      e.preventDefault()
      setSelectedPath(flatFiles[nextIndex])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tree, selectedPath])

  const rawQuery = search.trim()
  const query = rawQuery.toLowerCase()
  const canSearchContent = rawQuery.length >= 2
  const localFuzzyRows: SearchRow[] = query === ''
    ? []
    : allFiles
        .filter(matchesFilters)
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
  const searchRows = mergeRows(
    contentSearch.fuzzy.filter(hit => matchesFilters(hit.path)).map(hit => rowFromHit(hit, metaMap, query)),
    localFuzzyRows
  ).sort(compareSearchRows)

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
                    : filtersActive
                      ? `${filteredFiles.length} of ${allFiles.length} files`
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
          {!sidebarCollapsed && !loading && !loadError && (
            <div className="files-filter-row">
              <Select.Root size="1" value={filterProject} onValueChange={setFilterProject}>
                <Select.Trigger variant="surface" className="files-filter-trigger" />
                <Select.Content>
                  <Select.Item value="all">All projects</Select.Item>
                  {projectOptions.map(project => (
                    <Select.Item key={project} value={project}>{project}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Select.Root
                size="1"
                value={filterUpdated}
                onValueChange={v => setFilterUpdated(v as UpdatedFilter)}
              >
                <Select.Trigger variant="surface" className="files-filter-trigger" />
                <Select.Content>
                  {UPDATED_FILTER_OPTIONS.map(opt => (
                    <Select.Item key={opt.value} value={opt.value}>{opt.label}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </div>
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
              <section className="files-search-section">
                <div className="files-search-section-header">
                  <span>Results</span>
                  <span className="files-search-section-count">{searchRows.length}</span>
                  {contentSearchLoading && canSearchContent && <Spinner size="1" />}
                </div>
                {searchRows.length === 0 ? (
                  <p className="files-route-message files-route-message--compact">
                    {contentSearchLoading && canSearchContent ? 'Searching…' : 'No matches.'}
                  </p>
                ) : searchRows.map((file, idx) => {
                  const isSelected = file.path === selectedPath
                  const isActive = idx === activeIndex
                  const project = projectFromPath(file.path)
                  return (
                    <Tooltip key={file.id} content={file.path} side="right" delayDuration={600}>
                      <button
                        ref={el => { itemRefs.current[idx] = el }}
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
          onSaved={handleSaved}
          onEnterEdit={() => setSidebarCollapsed(true)}
        />
      </div>
    </div>
  )
}
