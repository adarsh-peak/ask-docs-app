import { Button, Callout } from '@radix-ui/themes'
import { BlogPost } from '@adarsh_goswami/design'
import type { Source } from '../../types'

interface AssistantMessageProps {
  text: string
  isStreaming?: boolean
  isThinking?: boolean
  thinkingLabel?: string
  sources?: Source[]
  onSourceClick?: (source: Source) => void
  error?: boolean
  fallback?: boolean
}

export function AssistantMessage({
  text,
  isStreaming,
  isThinking,
  thinkingLabel = 'thinking…',
  sources,
  onSourceClick,
  error,
  fallback,
}: AssistantMessageProps) {
  const active = isThinking || isStreaming
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'flex-start' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dim) 100%)',
        boxShadow: active ? 'var(--brand-shadow-accent)' : 'none',
        animation: active ? 'ad-avatar-pulse 2s ease-in-out infinite' : 'none',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {isThinking ? (
          <p style={{
            margin: 0, fontSize: 13, color: 'var(--text-muted)',
            fontFamily: 'var(--brand-font-mono)',
          }}>
            {thinkingLabel}
            <span className="thinking-dot">.</span>
            <span className="thinking-dot">.</span>
            <span className="thinking-dot">.</span>
          </p>
        ) : error ? (
          <Callout.Root color="red">
            <Callout.Text>{text || 'Something went wrong.'}</Callout.Text>
          </Callout.Root>
        ) : (
          <>
            {fallback ? (
              <Callout.Root color="gray">
                <Callout.Text>{text}</Callout.Text>
              </Callout.Root>
            ) : (
              <div style={{ position: 'relative' }}>
                <BlogPost content={text} />
                {isStreaming && <span className="stream-caret" />}
              </div>
            )}
            {!isStreaming && sources && sources.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12,
                alignItems: 'center',
              }}>
                <span style={{
                  fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase',
                  letterSpacing: '0.08em', fontFamily: 'var(--brand-font-mono)',
                }}>sources</span>
                {sources.map((src, i) => {
                  const filename = src.path.split('/').pop() || src.path
                  return (
                    <Button
                      key={i}
                      size="1"
                      variant="soft"
                      color="gray"
                      onClick={() => onSourceClick?.(src)}
                    >
                      {i + 1} · {filename}
                    </Button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
