import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Header } from './components/Header'
import { ChatView } from './components/ChatView'
import { HomeView } from './components/HomeView'
import { HowItWorksView } from './components/HowItWorksView'
import { FilesView } from './components/FilesView'
import { GraphView } from './components/GraphView'
import { ApiKeyGate } from './components/ApiKeyGate'
import { Toast } from './components/Toast'
import { CelebrationOverlay } from './components/CelebrationOverlay'
import { CelebrationModal } from './components/CelebrationModal'

const KEY_STORAGE = 'ask-docs:gemini-api-key'
const PENDING_CELEBRATION_STORAGE = 'ask-docs:pending-celebration'

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
  const [celebrating, setCelebrating] = useState(false)
  const [celebratingCount, setCelebratingCount] = useState(0)
  const [showCelebrationModal, setShowCelebrationModal] = useState(false)
  const prevDocCountRef = useRef<number | null>(null)

  const refreshStats = useCallback(async () => {
    try {
      const r = await fetch('/stats')
      if (r.ok) {
        const j = await r.json()
        const newDocCount = j.docs_indexed ?? 0
        const prev = prevDocCountRef.current
        if (prev !== null && newDocCount !== prev && newDocCount > 0 && newDocCount % 50 === 0) {
          setCelebratingCount(newDocCount)
          setCelebrating(true)
          setShowCelebrationModal(true)
        }
        prevDocCountRef.current = newDocCount
        setDocCount(newDocCount)
        setChunkCount(j.chunks_indexed ?? 0)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const pending = localStorage.getItem(PENDING_CELEBRATION_STORAGE)
    if (pending) {
      localStorage.removeItem(PENDING_CELEBRATION_STORAGE)
      setCelebratingCount(Number(pending))
      setCelebrating(true)
      setShowCelebrationModal(true)
    }
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
      setToast({ text: `Done — ${j.new ?? 0} new, ${j.updated ?? 0} updated, ${j.deleted ?? 0} deleted, ${j.skipped ?? 0} skipped, ${j.chunks_added ?? 0} chunks`, kind: 'success' })

      try {
        const statsRes = await fetch('/stats')
        if (statsRes.ok) {
          const sj = await statsRes.json()
          const newDocCount = sj.docs_indexed ?? 0
          const prev = prevDocCountRef.current
          if (prev !== null && newDocCount !== prev && newDocCount > 0 && newDocCount % 50 === 0) {
            localStorage.setItem(PENDING_CELEBRATION_STORAGE, String(newDocCount))
          }
        }
      } catch { /* ignore */ }

      setTimeout(() => window.location.reload(), 1500)
    } catch {
      setToast({ text: 'Reindex failed.', kind: 'error' })
    } finally {
      setIsReindexing(false)
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
    <div className="app-shell">
      <Header
        docCount={docCount}
        chunkCount={chunkCount}
        isReindexing={isReindexing}
        apiKey={apiKey}
        onReindex={onReindex}
        onWipeReindex={onWipeReindex}
        onUpdateKey={onUpdateKey}
        onForgetKey={onForgetKey}
        onTestCelebrate={() => { setCelebratingCount(docCount); setCelebrating(true); setShowCelebrationModal(true) }}
      />
      <main className="app-main" id="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/files" replace />} />
          <Route path="/ask" element={
            <ChatView
              apiKey={apiKey}
              onAddKey={() => setEditingKey(true)}
            />
          } />
          <Route path="/home" element={<HomeView />} />
          <Route path="/how-it-works" element={<HowItWorksView />} />
          <Route path="/files" element={<FilesView />} />
          <Route path="/graph" element={<GraphView />} />
        </Routes>
      </main>
      {toast && <Toast text={toast.text} kind={toast.kind} onDone={() => setToast(null)} />}
      {editingKey && <ApiKeyGate onSubmit={onKeySubmit} onClose={() => setEditingKey(false)} />}
      {celebrating && <CelebrationOverlay onDone={() => setCelebrating(false)} />}
      {showCelebrationModal && (
        <CelebrationModal docCount={celebratingCount} onClose={() => setShowCelebrationModal(false)} />
      )}
    </div>
  )
}
