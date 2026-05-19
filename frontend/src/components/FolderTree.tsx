import { useState } from 'react'
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

function FolderClosedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor" style={{ flexShrink: 0, opacity: 0.6 }}>
      <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.379a1.5 1.5 0 0 1 1.06.44l.622.621A1.5 1.5 0 0 0 7.62 3.5H10.5A1.5 1.5 0 0 1 12 5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 1 10V3.5z"/>
    </svg>
  )
}

export function FolderTree({ nodes, selectedPath, onSelectFile }: FolderTreeProps) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())

  const toggleFolder = (fullPath: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev)
      next.has(fullPath) ? next.delete(fullPath) : next.add(fullPath)
      return next
    })
  }

  const renderNode = (node: TreeNode, depth: number) => {
    if (node.kind === 'folder') {
      const isOpen = openFolders.has((node as TreeFolder).fullPath)
      return (
        <div key={(node as TreeFolder).fullPath}>
          <button
            onClick={() => toggleFolder((node as TreeFolder).fullPath)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 5,
              paddingLeft: 10 + depth * 14,
              paddingTop: 5, paddingBottom: 5, paddingRight: 8,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--brand-font-body)',
              fontSize: 12, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              textAlign: 'left', userSelect: 'none',
            }}
          >
            <ChevronIcon open={isOpen} />
            <FolderClosedIcon />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.name}
            </span>
          </button>
          {isOpen && (node as TreeFolder).children.map(child => renderNode(child, depth + 1))}
        </div>
      )
    }

    const isSelected = node.path === selectedPath
    return (
      <button
        key={node.path}
        onClick={() => onSelectFile(node.path)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          paddingLeft: 10 + depth * 14,
          paddingTop: 5, paddingBottom: 5, paddingRight: 8,
          background: isSelected ? 'var(--accent-subtle)' : 'transparent',
          border: 'none', cursor: 'pointer',
          borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
          color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
          fontFamily: 'var(--brand-font-body)', fontSize: 13, textAlign: 'left',
          transition: 'background 100ms, color 100ms',
          userSelect: 'none',
        }}
      >
        <FileDocIcon />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.title ?? node.name}
        </span>
      </button>
    )
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 16 }}>
      {nodes.map(node => renderNode(node, 0))}
    </div>
  )
}
