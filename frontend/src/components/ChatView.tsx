import { useState, useRef, useEffect } from 'react'
import { Button } from '@radix-ui/themes'
import { EmptyState } from './EmptyState'
import { Composer } from './Composer'
import { UserMessage } from './messages/UserMessage'
import { AssistantMessage } from './messages/AssistantMessage'
import { SourcePanel } from './SourcePanel'
import { streamChat, extractSources } from '../api/stream'
import type { Message, Source } from '../types'

interface ChatViewProps {
  apiKey: string
  onAddKey: () => void
}

export function ChatView({ apiKey, onAddKey }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [composerValue, setComposerValue] = useState('')
  const [isAnswering, setIsAnswering] = useState(false)
  const [openSource, setOpenSource] = useState<Source | null>(null)

  const historyRef = useRef<Array<{ role: string; content: string }>>([])
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)

  useEffect(() => {
    if (openSource) document.body.classList.add('drawer-open')
    else document.body.classList.remove('drawer-open')
    return () => document.body.classList.remove('drawer-open')
  }, [openSource])

  const newChat = () => {
    abortRef.current?.abort()
    setMessages([])
    historyRef.current = []
    setComposerValue('')
    setIsAnswering(false)
  }

  // Auto-scroll only when the user is already pinned to the bottom
  useEffect(() => {
    const el = scrollRef.current
    if (el && stickRef.current) el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); newChat() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const stopAnswering = () => {
    abortRef.current?.abort()
    setMessages(prev => {
      const copy = [...prev]
      const last = copy[copy.length - 1]
      if (last?.role === 'assistant') {
        const had = last.content.trim()
        copy[copy.length - 1] = {
          ...last, thinking: false, streaming: false,
          content: had ? last.content : 'Stopped.',
        }
        if (had) historyRef.current = [...historyRef.current, { role: 'assistant', content: last.content }]
        else historyRef.current = historyRef.current.slice(0, -1)
      }
      return copy
    })
    setIsAnswering(false)
  }

  const submitMessage = async (text: string) => {
    if (!text.trim() || isAnswering) return
    setComposerValue('')
    setIsAnswering(true)
    stickRef.current = true

    const userMsg: Message = { role: 'user', content: text }
    const thinkingMsg: Message = {
      role: 'assistant', content: '', sources: [],
      thinking: true, streaming: false, error: false,
      thinkingLabel: 'searching your docs…',
    }
    setMessages(prev => [...prev, userMsg, thinkingMsg])
    historyRef.current = [...historyRef.current, { role: 'user', content: text }]

    abortRef.current = new AbortController()
    let accumulated = ''
    const collectedResults: Array<{ name: string; result: unknown }> = []

    try {
      await streamChat(
        text, apiKey, historyRef.current.slice(0, -1),
        {
          onToken: (t) => {
            accumulated += t
            setMessages(prev => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last.role === 'assistant') copy[copy.length - 1] = { ...last, content: accumulated, thinking: false, streaming: true }
              return copy
            })
          },
          onToolCall: () => {
            setMessages(prev => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last.role === 'assistant') copy[copy.length - 1] = { ...last, thinking: true, thinkingLabel: 'searching your docs…' }
              return copy
            })
          },
          onToolResult: (name, result) => { collectedResults.push({ name, result }) },
          onDone: (answer, fallback) => {
            const sources = extractSources(collectedResults)
            historyRef.current = [...historyRef.current, { role: 'assistant', content: answer }]
            setMessages(prev => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last.role === 'assistant') copy[copy.length - 1] = { ...last, content: answer, thinking: false, streaming: false, sources, fallback }
              return copy
            })
            setIsAnswering(false)
          },
          onError: (detail) => {
            // The turn failed — drop the user entry so it doesn't poison later context
            historyRef.current = historyRef.current.slice(0, -1)
            setMessages(prev => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last.role === 'assistant') copy[copy.length - 1] = { ...last, content: detail, thinking: false, streaming: false, error: true }
              return copy
            })
            setIsAnswering(false)
          },
        },
        abortRef.current.signal,
      )
    } catch {
      setIsAnswering(false)
    }
  }

  if (!apiKey) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        padding: 32,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            margin: '0 0 6px', fontSize: 15, fontWeight: 600,
            color: 'var(--text-primary)', fontFamily: 'var(--brand-font-body)',
          }}>Chat requires a Gemini API key</p>
          <p style={{
            margin: 0, fontSize: 13, color: 'var(--text-muted)',
            fontFamily: 'var(--brand-font-body)',
          }}>
            Files and Graph work without one.
          </p>
        </div>
        <Button size="3" onClick={onAddKey}>Add API key</Button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        {messages.length === 0 ? (
          <EmptyState onPick={text => setComposerValue(text)} />
        ) : (
          <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '32px 24px 24px' }}>
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <UserMessage key={i} text={m.content} />
              ) : (
                <AssistantMessage
                  key={i}
                  text={m.content}
                  isStreaming={m.streaming}
                  isThinking={m.thinking}
                  thinkingLabel={m.thinkingLabel}
                  sources={m.sources}
                  onSourceClick={setOpenSource}
                  error={m.error}
                  fallback={m.fallback}
                />
              )
            )}
          </div>
        )}
      </div>
      <Composer
        value={composerValue}
        onChange={setComposerValue}
        onSubmit={() => submitMessage(composerValue)}
        onStop={stopAnswering}
        isAnswering={isAnswering}
        autoFocus
      />
      <SourcePanel source={openSource} onClose={() => setOpenSource(null)} />
    </div>
  )
}
