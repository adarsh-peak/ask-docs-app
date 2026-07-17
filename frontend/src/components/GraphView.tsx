import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { ForceGraphMethods } from 'react-force-graph-2d'
// @ts-ignore - d3-force-3d ships no TS types; it is the same force engine used internally.
import { forceManyBody, forceCenter, forceCollide, forceX, forceY } from 'd3-force-3d'
import { Button, IconButton, Spinner, TextField, Tooltip } from '@radix-ui/themes'
import { useTheme } from '@adarsh_goswami/design'
import { useNavigate } from 'react-router-dom'
import { fetchDocContent, fetchDocs } from '../api/docs'
import { buildGraphData } from '../utils/buildGraphData'
import type { DocMeta, GraphData, GraphLink, GraphNode } from '../types'

type GraphMode = 'map' | 'links' | 'tags' | 'full'
type MutableGraphLink = Omit<GraphLink, 'source' | 'target'> & {
  source: string | GraphNode
  target: string | GraphNode
}

const FOLDER_PALETTE = [
  '#3DB5FF',
  '#FFB347',
  '#DA70D6',
  '#4ECDC4',
  '#FF6B6B',
  '#A8DADC',
  '#7C6EFA',
  '#FF85C1',
  '#B5E48C',
  '#F4A261',
  '#90BE6D',
  '#48CAE4',
]

const TAG_COLOR = '#3DD68C'
const WIKI_LINK_COLOR_DARK = 'rgba(170, 165, 255, 0.42)'
const WIKI_LINK_COLOR_LIGHT = 'rgba(77, 64, 180, 0.28)'
const TAG_LINK_COLOR_DARK = 'rgba(61, 214, 140, 0.18)'
const TAG_LINK_COLOR_LIGHT = 'rgba(11, 128, 73, 0.16)'
const TAG_LIMIT = 80

function sourceId(link: MutableGraphLink): string {
  return typeof link.source === 'string' ? link.source : link.source.id
}

function targetId(link: MutableGraphLink): string {
  return typeof link.target === 'string' ? link.target : link.target.id
}

function shortDocLabel(node: GraphNode): string {
  const raw = node.type === 'doc'
    ? (node.path?.split('/').pop()?.replace(/\.md$/i, '') ?? node.label)
    : node.label
  return raw.length > 30 ? `${raw.slice(0, 30)}...` : raw
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase()
}

function nodeMatchesQuery(node: GraphNode, query: string): boolean {
  if (!query) return false
  return (
    node.label.toLowerCase().includes(query) ||
    (node.path ?? '').toLowerCase().includes(query) ||
    (node.folder ?? '').toLowerCase().includes(query) ||
    (node.tags ?? []).some(tag => tag.toLowerCase().includes(query))
  )
}

function computeDegrees(data: GraphData): Record<string, number> {
  const degree: Record<string, number> = {}
  data.nodes.forEach(node => { degree[node.id] = 0 })
  data.links.forEach(rawLink => {
    const link = rawLink as MutableGraphLink
    const src = sourceId(link)
    const tgt = targetId(link)
    degree[src] = (degree[src] || 0) + (link.value ?? 1)
    degree[tgt] = (degree[tgt] || 0) + (link.value ?? 1)
  })
  return degree
}

function nodeColor(node: GraphNode, folderColorMap: Record<string, string>): string {
  if (node.type === 'tag') return TAG_COLOR
  if (!node.folder) return '#8B8F98'
  return folderColorMap[node.folder] ?? FOLDER_PALETTE[0]
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return `rgba(124, 110, 250, ${alpha})`
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function buildNeighbors(links: GraphLink[]): Map<string, Set<string>> {
  const neighbors = new Map<string, Set<string>>()
  const add = (a: string, b: string) => {
    if (!neighbors.has(a)) neighbors.set(a, new Set())
    neighbors.get(a)!.add(b)
  }
  links.forEach(rawLink => {
    const link = rawLink as MutableGraphLink
    const src = sourceId(link)
    const tgt = targetId(link)
    add(src, tgt)
    add(tgt, src)
  })
  return neighbors
}

function buildVisibleGraph(
  fullData: GraphData,
  mode: GraphMode,
  query: string,
  folder: string | null,
): GraphData {
  if (fullData.nodes.length === 0) return fullData

  const allNodesById = new Map(fullData.nodes.map(node => [node.id, node]))
  const fullDegrees = computeDegrees(fullData)
  const hasQuery = query.length > 0
  const isFullMode = mode === 'full'
  const allowTags = isFullMode || mode === 'map' || mode === 'tags'
  const allowWiki = isFullMode || mode === 'map' || mode === 'links'
  const tagIds = new Set(
    fullData.nodes
      .filter(node => node.type === 'tag')
      .sort((a, b) => (fullDegrees[b.id] || 0) - (fullDegrees[a.id] || 0))
      .slice(0, TAG_LIMIT)
      .map(node => node.id)
  )

  const nodeIds = new Set<string>()
  const addNode = (id: string) => {
    const node = allNodesById.get(id)
    if (!node) return
    if (node.type === 'doc' && folder && node.folder !== folder) return
    if (node.type === 'tag' && !allowTags) return
    if (node.type === 'tag' && !isFullMode && !hasQuery && !tagIds.has(id)) return
    nodeIds.add(id)
  }

  fullData.nodes.forEach(node => {
    if (node.type !== 'doc') return
    if (folder && node.folder !== folder) return
    if (!hasQuery) addNode(node.id)
    else if (nodeMatchesQuery(node, query)) addNode(node.id)
  })

  if (hasQuery) {
    fullData.nodes.forEach(node => {
      if (nodeMatchesQuery(node, query)) addNode(node.id)
    })
  }

  const links: GraphLink[] = []
  fullData.links.forEach(rawLink => {
    const link = rawLink as MutableGraphLink
    if (link.type === 'tag' && !allowTags) return
    if (link.type === 'wiki' && !allowWiki) return

    const src = sourceId(link)
    const tgt = targetId(link)
    const srcNode = allNodesById.get(src)
    const tgtNode = allNodesById.get(tgt)
    if (!srcNode || !tgtNode) return

    if (folder && srcNode.type === 'doc' && srcNode.folder !== folder) return
    if (folder && tgtNode.type === 'doc' && tgtNode.folder !== folder) return
    if (tgtNode.type === 'tag' && !isFullMode && !hasQuery && !tagIds.has(tgt)) return

    const touchesVisibleNode = nodeIds.has(src) || nodeIds.has(tgt)
    if (!touchesVisibleNode) return

    addNode(src)
    addNode(tgt)

    if (nodeIds.has(src) && nodeIds.has(tgt)) links.push({
      source: src,
      target: tgt,
      type: link.type,
      value: link.value,
      label: link.label,
    })
  })

  return {
    nodes: Array.from(nodeIds)
      .map(id => allNodesById.get(id))
      .filter((node): node is GraphNode => Boolean(node)),
    links,
  }
}

export function GraphView() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [mode, setMode] = useState<GraphMode>('map')
  const [search, setSearch] = useState('')
  const [folderFilter, setFolderFilter] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined)
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const query = normalizeQuery(search)

  const folderColorMap = useMemo(() => {
    const folders = Array.from(new Set(
      graphData.nodes
        .filter(node => node.type === 'doc' && node.folder)
        .map(node => node.folder!)
    )).sort()
    const map: Record<string, string> = {}
    folders.forEach((folder, i) => {
      map[folder] = FOLDER_PALETTE[i % FOLDER_PALETTE.length]
    })
    return map
  }, [graphData.nodes])

  const folderColorMapRef = useRef(folderColorMap)
  useEffect(() => { folderColorMapRef.current = folderColorMap }, [folderColorMap])

  const fullDegrees = useMemo(() => computeDegrees(graphData), [graphData])

  const folderSummary = useMemo(() => {
    const counts = new Map<string, number>()
    graphData.nodes.forEach(node => {
      if (node.type !== 'doc' || !node.folder) return
      counts.set(node.folder, (counts.get(node.folder) || 0) + 1)
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [graphData.nodes])

  const visibleData = useMemo(
    () => buildVisibleGraph(graphData, mode, query, folderFilter),
    [graphData, mode, query, folderFilter]
  )

  const visibleDegrees = useMemo(() => computeDegrees(visibleData), [visibleData])
  const visibleNeighbors = useMemo(() => buildNeighbors(visibleData.links), [visibleData.links])
  const selectedNode = useMemo(
    () => graphData.nodes.find(node => node.id === selectedNodeId) ?? null,
    [graphData.nodes, selectedNodeId]
  )
  const activeNodeId = hoveredNodeId ?? selectedNodeId
  const highlightedIds = useMemo(() => {
    if (!activeNodeId) return null
    const ids = new Set<string>([activeNodeId])
    visibleNeighbors.get(activeNodeId)?.forEach(id => ids.add(id))
    return ids
  }, [activeNodeId, visibleNeighbors])

  const stats = useMemo(() => {
    const docCount = graphData.nodes.filter(node => node.type === 'doc').length
    const tagCount = graphData.nodes.filter(node => node.type === 'tag').length
    const wikiLinks = graphData.links.filter(link => link.type === 'wiki').length
    const tagLinks = graphData.links.filter(link => link.type === 'tag').length
    return { docCount, tagCount, wikiLinks, tagLinks }
  }, [graphData])

  const visibleTopNodes = useMemo(() => {
    return visibleData.nodes
      .slice()
      .sort((a, b) => (visibleDegrees[b.id] || 0) - (visibleDegrees[a.id] || 0))
      .slice(0, 12)
  }, [visibleData.nodes, visibleDegrees])

  const topNodeIds = useMemo(() => new Set(visibleTopNodes.map(node => node.id)), [visibleTopNodes])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setDimensions({ width: el.offsetWidth, height: el.offsetHeight })
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setLoadProgress('Loading document index')

    fetchDocs()
      .then(async docs => {
        if (cancelled) return
        setLoadProgress('Resolving note links')
        const contentPairs = await Promise.all(
          docs.map(async (doc: DocMeta) => {
            try {
              return [doc.path, await fetchDocContent(doc.path)] as const
            } catch {
              return [doc.path, ''] as const
            }
          })
        )
        if (cancelled) return
        setGraphData(buildGraphData(docs, Object.fromEntries(contentPairs)))
        setLoading(false)
        setLoadProgress('')
      })
      .catch(() => {
        if (cancelled) return
        setError('Graph data could not be loaded.')
        setLoading(false)
        setLoadProgress('')
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const fg = graphRef.current
    if (!fg || !visibleData.nodes.length || dimensions.width === 0) return

    const { width, height } = dimensions
    const cx = width / 2
    const cy = height / 2
    const folders = Array.from(new Set(
      visibleData.nodes
        .filter(node => node.type === 'doc' && node.folder)
        .map(node => node.folder!)
    )).sort()
    const clusterRadius = Math.min(width, height) * 0.28
    const folderPoints = new Map<string, { x: number; y: number }>()
    folders.forEach((folder, index) => {
      const angle = (index / Math.max(1, folders.length)) * Math.PI * 2 - Math.PI / 2
      folderPoints.set(folder, {
        x: cx + Math.cos(angle) * clusterRadius,
        y: cy + Math.sin(angle) * clusterRadius,
      })
    })

    fg.d3Force('charge', forceManyBody().strength((node: GraphNode) => node.type === 'tag' ? -55 : -85))
    fg.d3Force('center', forceCenter(cx, cy))
    fg.d3Force('clusterX', forceX((node: GraphNode) => {
      if (node.type === 'tag') return cx
      return node.folder ? (folderPoints.get(node.folder)?.x ?? cx) : cx
    }).strength((node: GraphNode) => node.type === 'tag' ? 0.015 : 0.055))
    fg.d3Force('clusterY', forceY((node: GraphNode) => {
      if (node.type === 'tag') return cy
      return node.folder ? (folderPoints.get(node.folder)?.y ?? cy) : cy
    }).strength((node: GraphNode) => node.type === 'tag' ? 0.015 : 0.055))
    fg.d3Force('collision', forceCollide().radius((node: GraphNode) => {
      const degree = visibleDegrees[node.id] || 0
      return Math.min(26, Math.sqrt(degree) * 2.4 + (node.type === 'tag' ? 8 : 10))
    }))
    const linkForce = fg.d3Force('link') as {
      distance: (value: number | ((link: GraphLink) => number)) => unknown
      strength: (value: number | ((link: GraphLink) => number)) => unknown
    } | undefined
    if (linkForce) {
      linkForce.distance((link: GraphLink) => link.type === 'wiki' ? 82 : 48)
      linkForce.strength((link: GraphLink) => link.type === 'wiki' ? 0.42 : 0.16)
    }

    fg.d3ReheatSimulation()
    const id = window.setTimeout(() => fg.zoomToFit(550, 56), 700)
    return () => window.clearTimeout(id)
  }, [visibleData, dimensions.width, dimensions.height, visibleDegrees])

  const fitGraph = useCallback(() => {
    graphRef.current?.zoomToFit(450, 56)
  }, [])

  const resetFilters = useCallback(() => {
    setSearch('')
    setFolderFilter(null)
    setSelectedNodeId(null)
    window.setTimeout(() => graphRef.current?.zoomToFit(450, 56), 0)
  }, [])

  const openSelectedDoc = useCallback(() => {
    if (!selectedNode || selectedNode.type !== 'doc') return
    navigate('/files', { state: { openPath: selectedNode.id } })
  }, [navigate, selectedNode])

  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: 'flex',
      overflow: 'hidden',
      borderTop: '1px solid color-mix(in srgb, var(--text-primary) 8%, transparent)',
    }}>
      <div ref={containerRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            color: 'var(--text-secondary)',
          }}>
            <Spinner size="3" />
            <p style={{ margin: 0, fontSize: 12, fontFamily: 'var(--brand-font-mono)' }}>
              {loadProgress}
            </p>
          </div>
        )}

        {!loading && error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {!loading && !error && dimensions.width > 0 && (
          <>
            <ForceGraph2D
              ref={graphRef}
              graphData={visibleData}
              width={dimensions.width}
              height={dimensions.height}
              d3AlphaDecay={0.035}
              d3VelocityDecay={0.42}
              cooldownTicks={120}
              nodeLabel={() => ''}
              linkLabel={(link: GraphLink) => link.type === 'wiki' ? 'Wiki link' : `Tag: ${link.label ?? ''}`}
              linkColor={(link: GraphLink) => {
                const mutableLink = link as MutableGraphLink
                const src = sourceId(mutableLink)
                const tgt = targetId(mutableLink)
                const isHighlighted = highlightedIds ? highlightedIds.has(src) && highlightedIds.has(tgt) : true
                if (!isHighlighted && mode === 'full') return isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'
                if (!isHighlighted) return isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.045)'
                if (link.type === 'wiki') return isDark ? WIKI_LINK_COLOR_DARK : WIKI_LINK_COLOR_LIGHT
                return isDark ? TAG_LINK_COLOR_DARK : TAG_LINK_COLOR_LIGHT
              }}
              linkWidth={(link: GraphLink) => {
                const value = Math.min(4, Math.sqrt(link.value ?? 1))
                return link.type === 'wiki' ? 0.9 + value * 0.35 : 0.45 + value * 0.18
              }}
              linkLineDash={(link: GraphLink) => link.type === 'tag' ? [3, 4] : null}
              linkDirectionalArrowLength={(link: GraphLink) => link.type === 'wiki' ? 3 : 0}
              linkDirectionalArrowRelPos={0.86}
              backgroundColor="transparent"
              onNodeClick={(node: GraphNode) => setSelectedNodeId(node.id)}
              onBackgroundClick={() => setSelectedNodeId(null)}
              onNodeHover={(node: GraphNode | null) => setHoveredNodeId(node?.id ?? null)}
              showPointerCursor
              nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
                const x = node.x ?? 0
                const y = node.y ?? 0
                const degree = visibleDegrees[node.id] || 0
                const baseRadius = node.type === 'tag' ? 4.5 : 5.5
                const nodeRadius = Math.min(node.type === 'tag' ? 11 : 13, Math.sqrt(degree) * 1.7 + baseRadius)
                const isActive = activeNodeId === node.id
                const isNeighbor = highlightedIds?.has(node.id) ?? true
                const opacity = isNeighbor ? 1 : mode === 'full' ? 0.58 : 0.22
                const fill = nodeColor(node, folderColorMapRef.current)

                ctx.save()
                ctx.globalAlpha = opacity
                ctx.beginPath()
                if (node.type === 'tag') {
                  ctx.moveTo(x, y - nodeRadius)
                  ctx.lineTo(x + nodeRadius, y)
                  ctx.lineTo(x, y + nodeRadius)
                  ctx.lineTo(x - nodeRadius, y)
                  ctx.closePath()
                } else {
                  ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI)
                }
                ctx.fillStyle = fill
                ctx.fill()

                if (isActive || selectedNodeId === node.id) {
                  ctx.shadowColor = hexToRgba(fill, isDark ? 0.55 : 0.28)
                  ctx.shadowBlur = 10 / Math.sqrt(globalScale)
                  ctx.lineWidth = 4.2 / Math.sqrt(globalScale)
                  ctx.strokeStyle = hexToRgba(fill, isDark ? 0.9 : 0.78)
                  ctx.stroke()
                } else if (node.type === 'doc') {
                  ctx.lineWidth = 1 / Math.sqrt(globalScale)
                  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.16)' : hexToRgba(fill, 0.42)
                  ctx.stroke()
                }

                const shouldLabel = (
                  isActive ||
                  selectedNodeId === node.id ||
                  (highlightedIds?.has(node.id) && degree >= 4) ||
                  (!activeNodeId && topNodeIds.has(node.id) && degree >= 6)
                )
                if (shouldLabel) {
                  const label = shortDocLabel(node)
                  const fontSize = Math.max(9, 12 / Math.sqrt(globalScale))
                  ctx.font = `${fontSize}px var(--brand-font-body), Inter, sans-serif`
                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'top'
                  ctx.lineWidth = 3.5 / Math.sqrt(globalScale)
                  ctx.strokeStyle = isDark ? 'rgba(8,8,10,0.88)' : 'rgba(255,255,255,0.92)'
                  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(18,18,20,0.88)'
                  ctx.strokeText(label, x, y + nodeRadius + 4)
                  ctx.fillText(label, x, y + nodeRadius + 4)
                }
                ctx.restore()
              }}
              nodePointerAreaPaint={(node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
                const x = node.x ?? 0
                const y = node.y ?? 0
                const degree = visibleDegrees[node.id] || 0
                const radius = Math.min(node.type === 'tag' ? 13 : 15, Math.sqrt(degree) * 1.7 + (node.type === 'tag' ? 7 : 8))
                ctx.beginPath()
                ctx.arc(x, y, radius, 0, 2 * Math.PI)
                ctx.fillStyle = color
                ctx.fill()
              }}
            />

            <div style={{
              position: 'absolute', top: 16, left: 16,
              display: 'flex', alignItems: 'center', gap: 8,
              padding: 8,
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--brand-radius-md)',
              boxShadow: 'var(--brand-shadow-sm)',
            }}>
              <TextField.Root
                size="2"
                name="graph-search"
                placeholder="Find note, tag, folder"
                value={search}
                onChange={event => setSearch(event.target.value)}
                style={{ width: 220 }}
              >
                <TextField.Slot>
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="none"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="5" cy="5" r="3.5"/>
                    <path d="M8.5 8.5 11 11"/>
                  </svg>
                </TextField.Slot>
              </TextField.Root>

              <div style={{
                display: 'flex',
                padding: 2,
                borderRadius: 'var(--brand-radius-sm)',
                background: 'color-mix(in srgb, var(--text-primary) 7%, transparent)',
              }}>
                {([
                  ['map', 'Map'],
                  ['links', 'Links'],
                  ['tags', 'Tags'],
                  ['full', 'Full'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    style={{
                      border: 'none',
                      borderRadius: 'var(--brand-radius-sm)',
                      padding: '5px 9px',
                      fontSize: 12,
                      color: mode === value ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: mode === value ? 'var(--bg-raised)' : 'transparent',
                      fontFamily: 'var(--brand-font-body)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Tooltip content="Fit graph">
                <IconButton variant="soft" color="gray" size="2" onClick={fitGraph} aria-label="Fit graph">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9"/>
                  </svg>
                </IconButton>
              </Tooltip>
              <Tooltip content="Reset filters">
                <IconButton variant="soft" color="gray" size="2" onClick={resetFilters} aria-label="Reset filters">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11.5 4.5A5 5 0 1 0 12 7"/>
                    <path d="M12 2v3h-3"/>
                  </svg>
                </IconButton>
              </Tooltip>
            </div>

            {visibleData.nodes.length === 0 && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                color: 'var(--text-secondary)',
                fontSize: 14,
              }}>
                No graph nodes match the current filters.
              </div>
            )}
          </>
        )}
      </div>

      <aside style={{
        width: 320,
        flexShrink: 0,
        borderLeft: '1px solid color-mix(in srgb, var(--text-primary) 8%, transparent)',
        background: 'color-mix(in srgb, var(--bg-surface) 88%, transparent)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <p style={{
            margin: '0 0 10px',
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'var(--brand-font-mono)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Graph
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Docs', stats.docCount],
              ['Tags', stats.tagCount],
              ['Wiki links', stats.wikiLinks],
              ['Tag links', stats.tagLinks],
            ].map(([label, value]) => (
              <div key={label} style={{
                padding: '8px 10px',
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--brand-radius-sm)',
                background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
              }}>
                <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--brand-font-mono)' }}>
                  {label}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 18, color: 'var(--text-primary)', fontWeight: 600 }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <p style={{
            margin: '0 0 10px',
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'var(--brand-font-mono)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Selection
          </p>
          {selectedNode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  width: 12,
                  height: 12,
                  marginTop: 4,
                  borderRadius: selectedNode.type === 'tag' ? 2 : '50%',
                  transform: selectedNode.type === 'tag' ? 'rotate(45deg)' : 'none',
                  background: nodeColor(selectedNode, folderColorMap),
                  flexShrink: 0,
                }} />
                <div style={{ minWidth: 0 }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: 15,
                    color: 'var(--text-primary)',
                    lineHeight: 1.3,
                    fontWeight: 600,
                  }}>
                    {selectedNode.label}
                  </h2>
                  <p style={{
                    margin: '4px 0 0',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    overflowWrap: 'anywhere',
                    fontFamily: 'var(--brand-font-mono)',
                  }}>
                    {selectedNode.type === 'doc' ? selectedNode.path : 'tag'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {fullDegrees[selectedNode.id] || 0} connections
                </span>
                {selectedNode.type === 'doc' && selectedNode.folder && (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {selectedNode.folder}
                  </span>
                )}
              </div>
              {selectedNode.type === 'doc' && selectedNode.tags && selectedNode.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedNode.tags.slice(0, 8).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSearch(tag)}
                      title={tag}
                      style={{
                        border: '1px solid var(--border-soft)',
                        borderRadius: 'var(--brand-radius-full)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        padding: '3px 7px',
                        fontSize: 11,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tag.length > 32 ? `${tag.slice(0, 32)}...` : tag}
                    </button>
                  ))}
                </div>
              )}
              {selectedNode.type === 'doc' && (
                <Button size="2" variant="soft" onClick={openSelectedDoc}>
                  Open file
                </Button>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Select a note or tag to inspect its neighborhood. Hovering a node highlights its first-degree links.
            </p>
          )}
        </div>

        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <p style={{
            margin: '0 0 10px',
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'var(--brand-font-mono)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Projects
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
            <button
              type="button"
              onClick={() => setFolderFilter(null)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: 'none',
                borderRadius: 'var(--brand-radius-sm)',
                background: folderFilter === null ? 'var(--accent-subtle)' : 'transparent',
                color: folderFilter === null ? 'var(--accent)' : 'var(--text-secondary)',
                padding: '6px 8px',
                fontSize: 12,
              }}
            >
              <span>All projects</span>
              <span>{stats.docCount}</span>
            </button>
            {folderSummary.map(([folder, count]) => (
              <button
                key={folder}
                type="button"
                onClick={() => setFolderFilter(folder === folderFilter ? null : folder)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  border: 'none',
                  borderRadius: 'var(--brand-radius-sm)',
                  background: folderFilter === folder ? 'var(--accent-subtle)' : 'transparent',
                  color: folderFilter === folder ? 'var(--accent)' : 'var(--text-secondary)',
                  padding: '6px 8px',
                  fontSize: 12,
                  textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: folderColorMap[folder] ?? FOLDER_PALETTE[0],
                    flexShrink: 0,
                  }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {folder}
                  </span>
                </span>
                <span>{count}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 16px', minHeight: 0, overflowY: 'auto' }}>
          <p style={{
            margin: '0 0 10px',
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'var(--brand-font-mono)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Hubs in view
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visibleTopNodes.map(node => (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelectedNodeId(node.id)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{
                  border: 'none',
                  borderRadius: 'var(--brand-radius-sm)',
                  background: selectedNodeId === node.id
                    ? 'var(--accent-subtle)'
                    : 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
                  color: selectedNodeId === node.id ? 'var(--accent)' : 'var(--text-secondary)',
                  padding: '7px 8px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 8,
                  alignItems: 'center',
                  textAlign: 'left',
                  fontSize: 12,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {shortDocLabel(node)}
                </span>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--brand-font-mono)', fontSize: 11 }}>
                  {visibleDegrees[node.id] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
