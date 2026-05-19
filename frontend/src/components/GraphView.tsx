import { useState, useEffect, useRef, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Spinner } from '@radix-ui/themes'
import { useNavigate } from 'react-router-dom'
import { fetchDocs } from '../api/docs'
import { buildGraphData } from '../utils/buildGraphData'
import type { GraphData } from '../types'

export function GraphView() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    // Set initial dimensions immediately
    setDimensions({ width: el.offsetWidth, height: el.offsetHeight })
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    fetchDocs()
      .then(docs => { setGraphData(buildGraphData(docs)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleNodeClick = useCallback((node: object) => {
    const n = node as { id: string; type: 'doc' | 'tag' }
    if (n.type === 'doc') {
      navigate('/files', { state: { openPath: n.id } })
    }
  }, [navigate])

  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Spinner size="3" />
          </div>
        )}
        {!loading && dimensions.width > 0 && (
          <ForceGraph2D
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            nodeLabel={(node: object) => (node as { label: string }).label}
            nodeColor={(node: object) => (node as { type: string }).type === 'doc' ? '#7C6EFA' : '#3DD68C'}
            nodeRelSize={5}
            linkColor={() => 'rgba(130, 120, 200, 0.3)'}
            backgroundColor="transparent"
            onNodeClick={handleNodeClick}
            nodeCanvasObject={(node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const n = node as { x?: number; y?: number; label: string; type: 'doc' | 'tag' }
              const x = n.x ?? 0
              const y = n.y ?? 0
              const radius = n.type === 'doc' ? 5 : 3.5
              const color = n.type === 'doc' ? '#7C6EFA' : '#3DD68C'

              ctx.beginPath()
              ctx.arc(x, y, radius, 0, 2 * Math.PI)
              ctx.fillStyle = color
              ctx.fill()

              if (globalScale > 1.8) {
                const label = n.label.length > 24 ? n.label.slice(0, 24) + '…' : n.label
                const fontSize = 9 / globalScale
                ctx.font = `${fontSize}px DM Sans, sans-serif`
                ctx.fillStyle = 'rgba(220, 215, 240, 0.85)'
                ctx.textAlign = 'center'
                ctx.fillText(label, x, y + radius + (10 / globalScale))
              }
            }}
          />
        )}

        {/* Legend */}
        {!loading && (
          <div style={{
            position: 'absolute', bottom: 20, right: 20,
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--brand-radius-md)',
            padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
            pointerEvents: 'none',
          }}>
            {[
              { color: '#7C6EFA', label: 'Document' },
              { color: '#3DD68C', label: 'Tag' },
            ].map(({ color, label }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, color: 'var(--text-secondary)',
                fontFamily: 'var(--brand-font-body)',
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {label}
              </div>
            ))}
            <p style={{
              margin: '4px 0 0', fontSize: 10, color: 'var(--text-muted)',
              fontFamily: 'var(--brand-font-mono)',
            }}>
              Click a doc to open it
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
