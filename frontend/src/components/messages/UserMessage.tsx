interface UserMessageProps {
  text: string
}

export function UserMessage({ text }: UserMessageProps) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end', marginBottom: 20,
    }}>
      <div style={{
        maxWidth: '80%', background: 'var(--accent-subtle)',
        border: '1px solid var(--accent-border)', borderRadius: 'var(--brand-radius-lg)',
        padding: '12px 16px', fontSize: 15, lineHeight: 1.6,
        color: 'var(--text-primary)', fontFamily: 'var(--brand-font-body)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {text}
      </div>
    </div>
  )
}
