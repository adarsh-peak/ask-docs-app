import { useEffect, useRef, useState } from 'react'
import { Tooltip } from '@radix-ui/themes'
import type { TreeNode, TreeFolder } from '../types'

interface FolderTreeProps {
  nodes: TreeNode[]
  selectedPath: string | null
  onSelectFile: (path: string) => void
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
      style={{ transition: 'transform 150ms', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}
    >
      <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

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

function FolderClosedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" style={{ flexShrink: 0, opacity: 0.6 }}>
      <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.379a1.5 1.5 0 0 1 1.06.44l.622.621A1.5 1.5 0 0 0 7.62 3.5H10.5A1.5 1.5 0 0 1 12 5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 1 10V3.5z"/>
    </svg>
  )
}

function getAncestorFolders(path: string): string[] {
  const segments = path.split('/')
  const ancestors: string[] = []
  for (let i = 0; i < segments.length - 1; i++) {
    ancestors.push(segments.slice(0, i + 1).join('/'))
  }
  return ancestors
}

function countFiles(folder: TreeFolder): number {
  return folder.children.reduce((count, child) => (
    count + (child.kind === 'folder' ? countFiles(child) : 1)
  ), 0)
}

export function FolderTree({ nodes, selectedPath, onSelectFile }: FolderTreeProps) {
  const selectedRef = useRef<HTMLButtonElement | null>(null)
  const [openFolders, setOpenFolders] = useState<Set<string>>(
    () => new Set(selectedPath ? getAncestorFolders(selectedPath) : [])
  )

  useEffect(() => {
    if (!selectedPath) return
    setOpenFolders(prev => {
      const next = new Set(prev)
      getAncestorFolders(selectedPath).forEach(folder => next.add(folder))
      return next
    })
  }, [selectedPath])

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedPath, openFolders])

  const toggleFolder = (fullPath: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev)
      next.has(fullPath) ? next.delete(fullPath) : next.add(fullPath)
      return next
    })
  }

  const renderNode = (node: TreeNode, depth: number) => {
    if (node.kind === 'folder') {
      const folder = node as TreeFolder
      const isOpen = openFolders.has(folder.fullPath)
      return (
        <div key={folder.fullPath}>
          <button
            className="file-tree-button file-tree-button--folder"
            onClick={() => toggleFolder(folder.fullPath)}
            style={{
              paddingLeft: 10 + depth * 14,
              paddingTop: 5, paddingBottom: 5, paddingRight: 8,
            }}
          >
            <ChevronIcon open={isOpen} />
            <FolderClosedIcon />
            <span className="file-tree-label">
              {node.name}
            </span>
            <span className="file-tree-count">{countFiles(folder)}</span>
          </button>
          {isOpen && folder.children.map(child => renderNode(child, depth + 1))}
        </div>
      )
    }

    const isSelected = node.path === selectedPath
    return (
      <Tooltip key={node.path} content={node.name} side="right" delayDuration={600}>
        <button
          ref={isSelected ? selectedRef : undefined}
          className={`file-tree-button file-tree-button--file${isSelected ? ' file-tree-button--selected' : ''}`}
          onClick={() => onSelectFile(node.path)}
          style={{
            paddingLeft: 10 + depth * 14,
            paddingTop: 5, paddingBottom: 5, paddingRight: 8,
          }}
        >
          {node.name.toLowerCase().endsWith('.md') ? <FileDocIcon /> : <FileGenericIcon />}
          <span className="file-tree-label">
            {node.title ?? node.name}
          </span>
        </button>
      </Tooltip>
    )
  }

  return (
    <div className="files-tree-scroll">
      {nodes.map(node => renderNode(node, 0))}
    </div>
  )
}
