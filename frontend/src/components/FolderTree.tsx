import { useEffect, useRef, useState } from 'react'
import { Tooltip } from '@radix-ui/themes'
import { WorkspaceIcon } from './WorkspaceIcon'
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

function folderColor(path: string) {
  const palette = ['#efb20a', '#ed792b', '#57974f', '#10a0a8', '#3a78c2', '#9873a3']
  const hash = Array.from(path.split('/')[0]).reduce((value, char) => value + char.charCodeAt(0), 0)
  return palette[hash % palette.length]
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
            aria-expanded={isOpen}
            style={{
              paddingLeft: 10 + depth * 18,
              paddingTop: 5, paddingBottom: 5, paddingRight: 8,
            }}
          >
            <ChevronIcon open={isOpen} />
            <WorkspaceIcon name="folder" size={20} style={{ color: folderColor(folder.fullPath), fill: folderColor(folder.fullPath) }} />
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
            paddingLeft: 26 + depth * 18,
            paddingTop: 5, paddingBottom: 5, paddingRight: 8,
          }}
        >
          <WorkspaceIcon name="file" size={18} />
          <span className="file-tree-label">
            {node.name}
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
