import { useState, useEffect } from 'react'
import { Spinner, Callout } from '@radix-ui/themes'
import { BlogPost } from '@adarsh_goswami/design'
import { fetchDocContent } from '../api/docs'

interface DocViewerProps {
  path: string | null
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-muted)', fontFamily: 'var(--brand-font-body)',
      fontSize: 14, padding: 32,
    }}>
      {children}
    </div>
  )
}

export function DocViewer({ path }: DocViewerProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!path) return
    setLoading(true)
    setContent(null)
    setError(null)
    fetchDocContent(path)
      .then(c => { setContent(c); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [path])

  if (!path) return <Centered>Select a file to read it.</Centered>
  if (loading) return <Centered><Spinner size="3" /></Centered>

  if (error) {
    return (
      <div style={{ flex: 1, padding: 32 }}>
        <Callout.Root color="red">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ padding: '32px 40px 64px' }}>
        <p style={{
          margin: '0 0 24px', fontSize: 11, fontFamily: 'var(--brand-font-mono)',
          color: 'var(--text-muted)', letterSpacing: '0.03em',
        }}>
          {path}
        </p>
        <BlogPost content={content ?? ''} />
      </div>
    </div>
  )
}
