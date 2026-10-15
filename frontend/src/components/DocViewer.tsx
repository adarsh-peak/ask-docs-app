import { useState, useEffect, useLayoutEffect, useRef, useMemo, useSyncExternalStore } from 'react'
import { Spinner, Callout, AlertDialog, Button, IconButton, Flex, DropdownMenu } from '@radix-ui/themes'
import { BlogPost } from './BlogPost'
import { DocEditor } from './DocEditor'
import { deleteDocumentAfterSave, isDocumentDeleting, subscribeDocumentDeletions } from './save-coordinator'
import { fetchDocContent, deleteDoc } from '../api/docs'
import { makeWikiResolver } from '../utils/wikiLink'
import { DocOutline } from './DocOutline'
import { WorkspaceIcon } from './WorkspaceIcon'
import type { DocMeta } from '../types'

const iconProps = {
  width: 15,
  height: 15,
  viewBox: '0 0 15 15',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const CopyIcon = () => (
  <svg {...iconProps}>
    <path d="M5.5 5.5V2.5C5.5 1.94772 5.94772 1.5 6.5 1.5H12.5C13.0523 1.5 13.5 1.94772 13.5 2.5V9.5C13.5 10.0523 13.0523 10.5 12.5 10.5H10.5M2.5 5.5H8.5C9.05228 5.5 9.5 5.94772 9.5 6.5V12.5C9.5 13.0523 9.05228 13.5 8.5 13.5H2.5C1.94772 13.5 1.5 13.0523 1.5 12.5V6.5C1.5 5.94772 1.94772 5.5 2.5 5.5Z" />
  </svg>
)

const CheckIcon = () => (
  <svg {...iconProps}>
    <path d="M2.5 7.5L6 11L12.5 3.5" />
  </svg>
)

const EditIcon = () => (
  <svg {...iconProps}>
    <path d="M11.5 2.5a1.5 1.5 0 0 1 2 2l-8 8L2 13.5l1-3.5 8.5-8.5Z" />
  </svg>
)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface DocViewerProps {
  path: string | null
  meta?: DocMeta | null
  onDelete?: (path: string) => void
  /** All vault file paths — used to resolve [[wiki-links]]. */
  allFiles?: string[]
  /** Open another doc (e.g. when a wiki-link is clicked). */
  onNavigate?: (path: string) => void
  /** Called after a successful save, so parents can refresh index metadata. */
  onSaved?: (path: string) => void
  /** Called when the user opens the editor (e.g. to collapse the sidebar). */
  onEnterEdit?: () => void
  /** When this matches `path` (e.g. right after creating a new file), the editor opens automatically once content loads. */
  autoEditPath?: string | null
  /** Called once the auto-edit above has been triggered, so the parent can clear it. */
  onAutoEditConsumed?: () => void
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="doc-viewer-centered">
      {children}
    </div>
  )
}

export function DocViewer({
  path,
  meta,
  onDelete,
  allFiles,
  onNavigate,
  onSaved,
  onEnterEdit,
  autoEditPath,
  onAutoEditConsumed,
}: DocViewerProps) {
  const [content, setContent] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const resolveWikiLink = useMemo(() => makeWikiResolver(allFiles ?? []), [allFiles])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const deleting = useSyncExternalStore(
    subscribeDocumentDeletions,
    () => isDocumentDeleting(path),
    () => false,
  )
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const readingPosition = useRef(0)
  useLayoutEffect(() => { readingPosition.current = 0; if (scrollRef.current) scrollRef.current.scrollTop = 0 }, [path])
  useLayoutEffect(() => { if (!editing && scrollRef.current) scrollRef.current.scrollTop = readingPosition.current }, [editing])

  const ext = path?.split('.').pop()?.toLowerCase() ?? ''
  const isMarkdown = ext === 'md'
  const isSvg = ext === 'svg'
  const fileName = path?.split('/').pop() ?? ''
  const displayTitle = fileName
  const folderPath = path?.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
  const fileType = ext ? ext.toUpperCase() : 'FILE'

  useEffect(() => {
    setEditing(false)
  }, [path])

  useEffect(() => {
    if (!deleting && !loading && content !== null && path && autoEditPath && path === autoEditPath) {
      setEditing(true)
      onEnterEdit?.()
      onAutoEditConsumed?.()
    }
  }, [deleting, loading, content, path, autoEditPath, onEnterEdit, onAutoEditConsumed])

  useEffect(() => {
    if (!path || (!isMarkdown && !isSvg)) {
      setLoading(false)
      setContent(null)
      setCreatedAt(null)
      setUpdatedAt(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setContent(null)
    setCreatedAt(null)
    setUpdatedAt(null)
    setError(null)
    fetchDocContent(path)
      .then(c => {
        if (cancelled) return
        setContent(c.content)
        setCreatedAt(c.created_at)
        setUpdatedAt(c.updated_at)
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setError(String(e))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [path, isMarkdown, isSvg])

  async function handleCopy() {
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleDelete() {
    if (!path || editing || deleting) return
    try {
      const result = await deleteDocumentAfterSave(path, deleteDoc)
      if (!result.ok) throw result.error
      onDelete?.(path)
    } catch (e) {
      setError(String(e))
    }
  }

  if (!path) return <Centered><div className="library-welcome"><h1>A place for what<br />you want to keep.</h1><p>Select a document from the files to start reading.</p></div></Centered>

  const renderHeader = () => (
    <div className="doc-viewer-header">
      <nav className="doc-breadcrumb" aria-label="Document location" title={path}>
        <span>Files</span><span aria-hidden="true" className="breadcrumb-divider">›</span>
        {folderPath && <><span className="doc-breadcrumb-folder">{folderPath}</span><span aria-hidden="true" className="breadcrumb-divider">›</span></>}
        <span className="doc-breadcrumb-file" aria-current="page">{displayTitle}</span>
      </nav>
      <div className="doc-viewer-actions">
        {isMarkdown && content != null && !editing && (
          <Button size="2" variant="outline" color="gray" className="doc-edit-button" disabled={deleting}
            onClick={() => { if (isDocumentDeleting(path)) return; readingPosition.current = scrollRef.current?.scrollTop ?? 0; setEditing(true); onEnterEdit?.() }}
            aria-label="Edit markdown"><EditIcon /> Edit Markdown</Button>
        )}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger><IconButton size="2" variant="outline" color="gray" aria-label="Document actions"><WorkspaceIcon name="more" /></IconButton></DropdownMenu.Trigger>
          <DropdownMenu.Content className="doc-actions-menu">
            {isMarkdown && content != null && <DropdownMenu.Item onSelect={handleCopy}>{copied ? <CheckIcon /> : <CopyIcon />}{copied ? 'Copied' : 'Copy Markdown'}</DropdownMenu.Item>}
            <DropdownMenu.Item color="red" disabled={editing || deleting} onSelect={() => setDeleteOpen(true)}>Delete file</DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Label>Document details</DropdownMenu.Label>
            <div className="doc-viewer-meta">
              <span className="doc-status-pill">{fileType}</span>
              <span className={`doc-status-pill ${meta ? 'doc-status-pill--indexed' : 'doc-status-pill--preview'}`}>{meta ? 'Indexed' : isMarkdown ? 'Not indexed' : 'Preview'}</span>
              {meta && <span className="doc-status-pill">{meta.chunks} chunks</span>}
              {updatedAt && <span className="doc-status-pill" title={`Created ${formatDate(createdAt ?? updatedAt)}`}>Updated {formatDate(updatedAt)}</span>}
              {(meta?.tags ?? []).map(tag => <span className="doc-tag" key={tag}>{tag}</span>)}
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialog.Content maxWidth="420px">
            <AlertDialog.Title>Delete file</AlertDialog.Title>
            <AlertDialog.Description size="2">This will permanently delete <strong>{fileName}</strong> from disk and remove indexed chunks for this path. This cannot be undone.</AlertDialog.Description>
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel><Button variant="soft" color="gray">Cancel</Button></AlertDialog.Cancel>
              <AlertDialog.Action><Button variant="solid" color="red" onClick={handleDelete}>Delete permanently</Button></AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </div>
    </div>
  )

  if (!isMarkdown && !isSvg) {
    return (
      <div className="doc-viewer-shell">
        <div className="doc-viewer-scroll">
          <div className="doc-viewer-content">
            {renderHeader()}
            <Centered>File type not supported for preview.</Centered>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="doc-viewer-shell">
        <div className="doc-viewer-scroll">
          <div className="doc-viewer-content">
            {renderHeader()}
            <Centered><Spinner size="3" /></Centered>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="doc-viewer-shell">
        <div className="doc-viewer-scroll">
          <div className="doc-viewer-content">
            {renderHeader()}
            <Callout.Root color="red">
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          </div>
        </div>
      </div>
    )
  }

  if (isSvg && content) {
    return (
      <div className="doc-viewer-shell">
        <div className="doc-viewer-scroll">
          <div className="doc-viewer-content">
            {renderHeader()}
            <div className="doc-svg-preview">
              <img
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`}
                alt={fileName}
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (editing && path) {
    return (
      <div className="doc-viewer-shell">
        <div className="doc-viewer-content" style={{ paddingBottom: 0, flexShrink: 0 }}>
          {renderHeader()}
        </div>
        <DocEditor
          path={path}
          initialContent={content ?? ''}
          onCancel={() => setEditing(false)}
          onSaved={(saved) => {
            setContent(saved)
            setUpdatedAt(new Date().toISOString())
            onSaved?.(path)
          }}
        />
      </div>
    )
  }

  return (
    <div className="doc-viewer-shell">
      <div ref={scrollRef} className="doc-viewer-scroll">
        <div className="doc-viewer-content">
          {renderHeader()}
          <div ref={contentRef} key={path} className="doc-reading-page">
            {!/^#\s/m.test(content ?? '') && <h1 className="document-fallback-title">{fileName.replace(/\.md$/, '').replace(/[-_]/g, ' ')}</h1>}
            <BlogPost
              content={content ?? ''}
              fill
              resolveWikiLink={resolveWikiLink}
              onWikiLink={(_target, resolved) => onNavigate?.(resolved)}
            />
          </div>
        </div>
      </div>
      <DocOutline scrollRef={scrollRef} contentRef={contentRef} content={content} />
    </div>
  )
}
