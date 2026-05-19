import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Spinner } from '@radix-ui/themes'
import { FolderTree } from './FolderTree'
import { DocViewer } from './DocViewer'
import { fetchDocs } from '../api/docs'
import { buildTree } from '../utils/buildTree'
import type { DocMeta, TreeNode } from '../types'

export function FilesView() {
  const [docs, setDocs] = useState<DocMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const location = useLocation()

  useEffect(() => {
    fetchDocs()
      .then(d => { setDocs(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Support graph view clicking a doc node → navigate here with state
  useEffect(() => {
    const openPath = (location.state as { openPath?: string } | null)?.openPath
    if (openPath) setSelectedPath(openPath)
  }, [location.state])

  const tree: TreeNode[] = buildTree(docs)
  const borderColor = 'color-mix(in srgb, var(--text-primary) 8%, transparent)'

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
      {/* Left: folder tree */}
      <div style={{
        width: 240, flexShrink: 0,
        borderRight: `1px solid ${borderColor}`,
        background: 'var(--bg-surface)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 14px 10px', flexShrink: 0,
          borderBottom: `1px solid ${borderColor}`,
        }}>
          {loading ? (
            <Spinner size="1" />
          ) : (
            <p style={{
              margin: 0, fontSize: 11, fontFamily: 'var(--brand-font-mono)',
              color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {docs.length} files
            </p>
          )}
        </div>
        {!loading && (
          <FolderTree
            nodes={tree}
            selectedPath={selectedPath}
            onSelectFile={setSelectedPath}
          />
        )}
      </div>

      {/* Right: doc content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '1100px' }}>
        <DocViewer path={selectedPath} />
      </div>
    </div>
  )
}
