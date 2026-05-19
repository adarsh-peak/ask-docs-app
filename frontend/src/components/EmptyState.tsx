import { Card, Text } from '@radix-ui/themes'

const SUGGESTIONS = [
  { label: 'Recall', text: 'What does my docs say about ' },
  { label: 'Synthesize', text: 'Summarize everything about ' },
  { label: 'Plan', text: 'Help me plan based on my notes on ' },
  { label: 'Explore', text: 'What are the key ideas in ' },
]

interface EmptyStateProps {
  onPick: (text: string) => void
}

export function EmptyState({ onPick }: EmptyStateProps) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', gap: 32,
    }}>
      <div className="empty-orb-wrap">
        <div className="empty-orb" />
        <div className="empty-ring" />
        <div className="empty-ring empty-ring--delayed" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{
          margin: '0 0 6px', fontSize: 22, fontWeight: 700,
          fontFamily: 'var(--brand-font-display)', color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>Ask your second brain</p>
        <p style={{
          margin: 0, fontSize: 14, color: 'var(--text-muted)',
          fontFamily: 'var(--brand-font-body)',
        }}>Search and chat over your Markdown vault</p>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', maxWidth: 480,
      }}>
        {SUGGESTIONS.map(s => (
          <Card key={s.label} asChild>
            <button onClick={() => onPick(s.text)} style={{ textAlign: 'left', cursor: 'pointer' }}>
              <Text
                as="div" size="1" weight="bold" mb="1"
                style={{
                  color: 'var(--accent)', textTransform: 'uppercase',
                  letterSpacing: '0.08em', fontFamily: 'var(--brand-font-mono)',
                }}
              >
                {s.label}
              </Text>
              <Text as="div" size="2" color="gray">{s.text}</Text>
            </button>
          </Card>
        ))}
      </div>
    </div>
  )
}
