import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Spinner, TextField, IconButton, Tooltip } from '@radix-ui/themes'
import { FolderTree } from './FolderTree'
import { DocViewer } from './DocViewer'
import { fetchDocs, fetchAllFiles } from '../api/docs'
import { buildFileTree } from '../utils/buildTree'
import type { DocMeta, TreeNode, TreeFile } from '../types'
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

export function FilesView() {
  const [allFiles, setAllFiles] = useState<string[]>([])
  const [docs, setDocs] = useState<DocMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(
    () => localStorage.getItem('filesView:selectedPath')
  )
  const [search, setSearch] = useState('')
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

  const query = search.trim().toLowerCase()
  const filteredFiles: TreeFile[] = query === ''
    ? []
    : allFiles
        .filter(path => {
          const meta = metaMap[path]
          const name = path.split('/').pop() ?? path
          return (
            path.toLowerCase().includes(query) ||
            name.toLowerCase().includes(query) ||
            (meta?.title ?? '').toLowerCase().includes(query) ||
            (meta?.tags ?? []).some(t => t.toLowerCase().includes(query))
          )
        })
        .map(path => {
          const meta = metaMap[path]
          return {
            kind: 'file' as const,
            name: path.split('/').pop() ?? path,
            path,
            title: meta?.title ?? null,
            tags: meta?.tags ?? [],
          }
        })

  // Reset the keyboard highlight to the top whenever the query changes
  useEffect(() => { setActiveIndex(0) }, [query])

  // Keep the highlighted result scrolled into view as arrows move it
  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && search) {
      e.preventDefault()
      setSearch('')
      return
    }
    if (filteredFiles.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, filteredFiles.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const file = filteredFiles[activeIndex]
      if (file) setSelectedPath(file.path)
    }
  }

  return (
    <div className="files-layout">
      {/* Left: folder tree */}
      <div className="files-sidebar">
        <div className="files-sidebar-header">
          {loading ? (
            <Spinner size="1" />
          ) : (
            <p className="files-sidebar-kicker">
              {loadError
                ? 'Files unavailable'
                : query
                  ? `${filteredFiles.length} of ${allFiles.length} files`
                  : `${allFiles.length} files / ${indexedCount} indexed${previewOnlyCount ? ` / ${previewOnlyCount} preview` : ''}`}
            </p>
          )}
          {!loading && !loadError && (
            <TextField.Root
              size="1"
              placeholder="Filter files…"
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
        {!loading && loadError && (
          <p className="files-route-message">
            Could not load files. {loadError}
          </p>
        )}
        {!loading && !loadError && allFiles.length === 0 && (
          <p className="files-route-message">No supported files found.</p>
        )}
        {!loading && !loadError && allFiles.length > 0 && (
          query ? (
            <div className="files-tree-scroll">
              {filteredFiles.length === 0 ? (
                <p className="files-route-message">No files match.</p>
              ) : filteredFiles.map((file, idx) => {
                const isSelected = file.path === selectedPath
                const isActive = idx === activeIndex
                const meta = metaMap[file.path]
                const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE'
                const tags = meta?.tags ?? []
                return (
                  <Tooltip key={file.path} content={file.name} side="right" delayDuration={600}>
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
                        <span className="file-search-title">{file.title ?? file.name}</span>
                        <span className="file-search-path">{file.path}</span>
                        <span className="file-search-badges">
                          <span className={`files-pill ${meta ? 'files-pill--indexed' : 'files-pill--preview'}`}>
                            {meta ? `${meta.chunks} chunks` : `${ext} preview`}
                          </span>
                          {tags.slice(0, 3).map(tag => (
                            <span className="files-pill" key={tag}>{tag}</span>
                          ))}
                        </span>
                      </span>
                    </button>
                  </Tooltip>
                )
              })}
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
