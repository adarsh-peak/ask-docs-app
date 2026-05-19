import { useRef, useEffect } from 'react'
import { TextArea, IconButton } from '@radix-ui/themes'

interface ComposerProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onStop?: () => void
  isAnswering?: boolean
  autoFocus?: boolean
  placeholder?: string
}

export function Composer({
  value, onChange, onSubmit, onStop, isAnswering, autoFocus, placeholder,
}: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isAnswering && value.trim()) onSubmit()
    }
  }

  return (
    <div style={{ flexShrink: 0, padding: '12px 24px 20px', background: 'var(--bg-base)' }}>
      <div style={{
        maxWidth: 760, margin: '0 auto',
        display: 'flex', alignItems: 'flex-end', gap: 8,
      }}>
        <TextArea
          ref={ref}
          size="3"
          radius="large"
          resize="none"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          disabled={isAnswering}
          placeholder={placeholder || 'Ask your second brain anything…'}
          rows={1}
          style={{ flex: 1 }}
        />
        {isAnswering && onStop ? (
          <IconButton
            size="3" variant="soft" color="gray"
            aria-label="Stop generating"
            onClick={onStop}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="2" width="10" height="10" rx="2" />
            </svg>
          </IconButton>
        ) : (
          <IconButton
            size="3" variant="solid"
            aria-label="Send message"
            disabled={isAnswering || !value.trim()}
            onClick={() => { if (!isAnswering && value.trim()) onSubmit() }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 14L14 8 2 2v4.5l8 1.5-8 1.5V14z" fill="currentColor" />
            </svg>
          </IconButton>
        )}
      </div>
    </div>
  )
}
