import { useEffect } from 'react'

interface ToastProps {
  text: string
  kind?: 'info' | 'success' | 'error'
  onDone: () => void
}

const KIND_COLOR: Record<string, string> = {
  info: 'var(--info)',
  success: 'var(--success)',
  error: 'var(--error)',
}

export function Toast({ text, kind = 'info', onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)',
      zIndex: 500, display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bg-overlay)', border: '1px solid var(--border-soft)',
      borderRadius: 'var(--brand-radius-full)', padding: '10px 18px',
      boxShadow: 'var(--brand-shadow-lg)', fontSize: 14,
      color: 'var(--text-primary)', fontFamily: 'var(--brand-font-body)',
      animation: 'ad-toast-in 220ms var(--brand-ease-out)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: KIND_COLOR[kind], flexShrink: 0,
      }} />
      {text}
    </div>
  )
}
