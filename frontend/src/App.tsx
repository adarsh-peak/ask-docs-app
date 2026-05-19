import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { CosmicBackground } from './components/CosmicBackground'
import { Header } from './components/Header'
import { ChatView } from './components/ChatView'
import { FilesView } from './components/FilesView'
import { GraphView } from './components/GraphView'
import { ApiKeyGate } from './components/ApiKeyGate'
import { Toast } from './components/Toast'

const KEY_STORAGE = 'ask-docs:gemini-api-key'

function loadKey(): string { return localStorage.getItem(KEY_STORAGE) || '' }
function saveKey(k: string) { localStorage.setItem(KEY_STORAGE, k) }
function removeKey() { localStorage.removeItem(KEY_STORAGE) }

export default function App() {
  const [apiKey, setApiKey] = useState<string>(loadKey)
  const [editingKey, setEditingKey] = useState(false)
  const [docCount, setDocCount] = useState(0)
  const [chunkCount, setChunkCount] = useState(0)
  const [isReindexing, setIsReindexing] = useState(false)
  const [toast, setToast] = useState<{ text: string; kind: 'info' | 'success' | 'error' } | null>(null)

  const refreshStats = useCallback(async () => {
    try {
      const r = await fetch('/stats')
      if (r.ok) {
        const j = await r.json()
        setDocCount(j.docs_indexed ?? 0)
        setChunkCount(j.chunks_indexed ?? 0)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    refreshStats()
    const id = setInterval(refreshStats, 30_000)
    return () => clearInterval(id)
  }, [refreshStats])

  const onKeySubmit = (k: string) => { saveKey(k); setApiKey(k); setEditingKey(false) }
  const onUpdateKey = () => setEditingKey(true)
  const onForgetKey = () => { removeKey(); setApiKey(''); setEditingKey(false) }

  const onReindex = async () => {
    setIsReindexing(true)
    setToast({ text: 'Reindexing new docs…', kind: 'info' })
    try {
      const r = await fetch('/admin/reindex', { method: 'POST' })
      const j = await r.json()
      setToast({ text: `Done — ${j.new ?? 0} new docs, ${j.chunks_added ?? 0} chunks`, kind: 'success' })
    } catch {
      setToast({ text: 'Reindex failed.', kind: 'error' })
    } finally {
      setIsReindexing(false)
      refreshStats()
    }
  }

  const onWipeReindex = async () => {
    try {
      await fetch('/admin/wipe', { method: 'POST' })
      setDocCount(0); setChunkCount(0)
      setToast({ text: 'Index wiped — reindex to start querying.', kind: 'error' })
    } catch {
      setToast({ text: 'Wipe failed.', kind: 'error' })
    }
  }

  return (
    <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CosmicBackground />
      <Header
        docCount={docCount}
        chunkCount={chunkCount}
        isReindexing={isReindexing}
        apiKey={apiKey}
        onReindex={onReindex}
        onWipeReindex={onWipeReindex}
        onUpdateKey={onUpdateKey}
        onForgetKey={onForgetKey}
      />
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0,
        width: '100%', maxWidth: 'var(--brand-layout-container-max)', margin: '0 auto',
      }}>
        <Routes>
          <Route path="/" element={
            <ChatView
              apiKey={apiKey}
              onAddKey={() => setEditingKey(true)}
            />
          } />
          <Route path="/files" element={<FilesView />} />
          <Route path="/graph" element={<GraphView />} />
        </Routes>
      </div>
      {toast && <Toast text={toast.text} kind={toast.kind} onDone={() => setToast(null)} />}
      {editingKey && <ApiKeyGate onSubmit={onKeySubmit} onClose={() => setEditingKey(false)} />}
    </div>
  )
}
