import { useEffect } from 'react'

interface CelebrationModalProps {
  docCount: number
  onClose: () => void
}

export function CelebrationModal({ docCount, onClose }: CelebrationModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 10000,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        background: 'var(--bg-overlay)', border: '1px solid var(--border-soft)',
        borderRadius: 'var(--brand-radius-lg, 16px)', padding: '28px 32px',
        boxShadow: 'var(--brand-shadow-lg)', textAlign: 'center',
        fontFamily: 'var(--brand-font-body)', minWidth: 280, maxWidth: 360,
        animation: 'ad-toast-in 220ms var(--brand-ease-out)',
      }}
    >
      <span style={{ fontSize: 40, lineHeight: 1 }}>🎉</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
        Milestone reached!
      </span>
      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        You've indexed <strong style={{ color: 'var(--text-primary)' }}>{docCount}</strong> docs. Keep it up!
      </span>
      <button
        onClick={onClose}
        style={{
          marginTop: 10, padding: '8px 20px', borderRadius: 'var(--brand-radius-full, 999px)',
          border: 'none', background: 'var(--accent)', color: 'var(--accent-contrast, #fff)',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Nice!
      </button>
    </div>
  )
}
