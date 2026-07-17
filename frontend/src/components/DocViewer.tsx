import { useState, useEffect, useRef, useMemo } from 'react'
import { Spinner, Callout, AlertDialog, Button, Flex } from '@radix-ui/themes'
import { BlogPost } from './BlogPost'
import { fetchDocContent, deleteDoc } from '../api/docs'
import { makeWikiResolver } from '../utils/wikiLink'
import { DocOutline } from './DocOutline'
import type { DocMeta } from '../types'

interface DocViewerProps {
  path: string | null
  meta?: DocMeta | null
  onDelete?: (path: string) => void
  /** All vault file paths — used to resolve [[wiki-links]]. */
  allFiles?: string[]
  /** Open another doc (e.g. when a wiki-link is clicked). */
  onNavigate?: (path: string) => void
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="doc-viewer-centered">
      {children}
    </div>
  )
}

export function DocViewer({ path, meta, onDelete, allFiles, onNavigate }: DocViewerProps) {
  const [content, setContent] = useState<string | null>(null)
  const resolveWikiLink = useMemo(() => makeWikiResolver(allFiles ?? []), [allFiles])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const ext = path?.split('.').pop()?.toLowerCase() ?? ''
  const isMarkdown = ext === 'md'
  const isSvg = ext === 'svg'
  const fileName = path?.split('/').pop() ?? ''
  const displayTitle = meta?.title || fileName
  const folderPath = path?.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
  const fileType = ext ? ext.toUpperCase() : 'FILE'

  useEffect(() => {
    if (!path || (!isMarkdown && !isSvg)) {
      setLoading(false)
      setContent(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setContent(null)
    setError(null)
    fetchDocContent(path)
      .then(c => {
        if (cancelled) return
        setContent(c)
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setError(String(e))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [path, isMarkdown, isSvg])

  async function handleDelete() {
    if (!path) return
    setDeleting(true)
    try {
      await deleteDoc(path)
      onDelete?.(path)
      setDeleting(false)
    } catch (e) {
      setError(String(e))
      setDeleting(false)
    }
  }

  if (!path) return <Centered>Select a file to read it.</Centered>

  const renderHeader = () => (
    <div className="doc-viewer-header">
      <div className="doc-viewer-title-wrap">
        <h1 className="doc-viewer-title">{displayTitle}</h1>
        {folderPath && (
          <p className="doc-viewer-path" title={path}>{folderPath}</p>
        )}
        <div className="doc-viewer-meta">
          <span className="doc-status-pill">{fileType}</span>
          <span className={`doc-status-pill ${meta ? 'doc-status-pill--indexed' : 'doc-status-pill--preview'}`}>
            {meta ? 'Indexed' : isMarkdown ? 'Not indexed' : 'Preview'}
          </span>
          {meta && <span className="doc-status-pill doc-status-pill--indexed">{meta.chunks} chunks</span>}
          {(meta?.tags ?? []).map(tag => (
            <span className="doc-tag" key={tag}>{tag}</span>
          ))}
        </div>
      </div>

      <div className="doc-viewer-actions">
        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button size="1" variant="ghost" color="red" disabled={deleting}>
              {deleting ? <Spinner size="1" /> : 'Delete'}
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="420px">
            <AlertDialog.Title>Delete file</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This will permanently delete <strong>{fileName}</strong> from disk
              and remove indexed chunks for this path. This cannot be undone.
            </AlertDialog.Description>
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">Cancel</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button variant="solid" color="red" onClick={handleDelete}>
                  Delete permanently
                </Button>
              </AlertDialog.Action>
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

  return (
    <div className="doc-viewer-shell">
      <div ref={scrollRef} className="doc-viewer-scroll">
        <div className="doc-viewer-content">
          {renderHeader()}
          <div ref={contentRef}>
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
