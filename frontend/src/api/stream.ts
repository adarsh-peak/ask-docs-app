import type { Source } from '../types'

export interface StreamCallbacks {
  onToken: (text: string) => void
  onToolCall: (name: string, args: Record<string, unknown>) => void
  onToolResult: (name: string, result: unknown) => void
  onDone: (answer: string, fallback?: boolean) => void
  onError: (detail: string) => void
}

export async function streamChat(
  query: string,
  apiKey: string,
  history: Array<{ role: string; content: string }>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let resp: Response
  try {
    resp = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, api_key: apiKey, history }),
      signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    callbacks.onError(String(e))
    return
  }

  if (!resp.ok || !resp.body) {
    callbacks.onError(`HTTP ${resp.status}`)
    return
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buf = ''

  while (true) {
    let done: boolean
    let value: Uint8Array | undefined
    try {
      ({ done, value } = await reader.read())
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      callbacks.onError(String(e))
      return
    }
    if (done) break
    buf += decoder.decode(value, { stream: true })

    let boundary: number
    while ((boundary = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, boundary)
      buf = buf.slice(boundary + 2)

      let eventName = 'message'
      let dataLine = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) eventName = line.slice(7).trim()
        else if (line.startsWith('data: ')) dataLine = line.slice(6).trim()
      }
      if (!dataLine) continue

      let payload: unknown
      try {
        payload = JSON.parse(dataLine)
      } catch {
        payload = dataLine
      }

      if (eventName === 'token') {
        callbacks.onToken(payload as string)
      } else if (eventName === 'tool_call') {
        const tc = payload as { name: string; args: Record<string, unknown> }
        callbacks.onToolCall(tc.name, tc.args)
      } else if (eventName === 'tool_result') {
        const tr = payload as { name: string; result: unknown }
        callbacks.onToolResult(tr.name, tr.result)
      } else if (eventName === 'done') {
        const d = payload as { answer: string; fallback?: boolean }
        callbacks.onDone(d.answer, d.fallback)
        return
      } else if (eventName === 'error') {
        const err = payload as { detail: string }
        callbacks.onError(err.detail)
        return
      }
    }
  }
}

export function extractSources(toolResults: Array<{ name: string; result: unknown }>): Source[] {
  const sources: Source[] = []
  for (const { result } of toolResults) {
    if (!Array.isArray(result)) continue
    for (const hit of result) {
      if (hit && typeof hit === 'object' && 'path' in hit) {
        sources.push({
          path: (hit as { path: string }).path,
          title: (hit as { title?: string }).title || (hit as { path: string }).path,
          snippet: (hit as { snippet?: string }).snippet || '',
        })
      }
    }
  }
  return sources
}
