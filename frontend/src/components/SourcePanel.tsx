import { useEffect } from 'react'
import { Badge, IconButton } from '@radix-ui/themes'
import { BlogPost } from '@adarsh_goswami/design'
import type { Source } from '../types'

interface SourcePanelProps {
  source: Source | null
  onClose: () => void
}

export function SourcePanel({ source, onClose }: SourcePanelProps) {
  useEffect(() => {
    if (!source) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [source, onClose])

  if (!source) return null

  const parts = (source.path || '').split('/')
  const filename = parts.pop() || source.path
  const folder = parts[0] || ''

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(10,10,11,0.5)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          animation: 'ad-backdrop-in 220ms ease',
        }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '90vw',
        zIndex: 301, background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-soft)',
        display: 'flex', flexDirection: 'column',
        animation: 'ad-panel-in 220ms var(--brand-ease-out)',
        boxShadow: 'var(--brand-shadow-lg)',
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            {folder && (
              <Badge variant="soft" radius="full" mb="2">{folder}</Badge>
            )}
            <p style={{
              margin: 0, fontSize: 14, fontWeight: 600,
              color: 'var(--text-primary)', fontFamily: 'var(--brand-font-body)',
              wordBreak: 'break-word',
            }}>{source.title || filename}</p>
            <p style={{
              margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)',
              fontFamily: 'var(--brand-font-mono)', wordBreak: 'break-all',
            }}>{source.path}</p>
          </div>
          <IconButton variant="ghost" color="gray" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12"/>
              <line x1="12" y1="2" x2="2" y2="12"/>
            </svg>
          </IconButton>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <BlogPost content={source.snippet || '_No excerpt available._'} />
        </div>
      </div>
    </>
  )
}
