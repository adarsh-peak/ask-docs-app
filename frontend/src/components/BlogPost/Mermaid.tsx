import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { Box, Dialog, DropdownMenu, Flex, IconButton, Text, TextField, Tooltip } from '@radix-ui/themes'
import { TransformWrapper, TransformComponent, useControls, useTransformEffect } from 'react-zoom-pan-pinch'

let renderCounter = 0

function chartStorageKey(chart: string): string {
  let h = 0
  for (let i = 0; i < chart.length; i++) {
    h = (Math.imul(31, h) + chart.charCodeAt(i)) | 0
  }
  return `mermaid-zoom-${h >>> 0}`
}

function chartFileStem(chart: string): string {
  return chartStorageKey(chart).replace('mermaid-zoom-', 'mermaid-diagram-')
}

function downloadableSvg(svg: string, background: string) {
  // Mermaid's SVG can contain HTML labels inside <foreignObject> (including
  // HTML-only markup such as <br>). Parse it as browser DOM rather than strict
  // XML; strict parsing turns otherwise valid Mermaid output into <parsererror>.
  const wrapper = document.createElement('div')
  wrapper.innerHTML = svg
  const root = wrapper.querySelector('svg')
  if (!root) throw new Error('The rendered diagram does not contain an SVG.')
  const viewBox = (root.getAttribute('viewBox') ?? '')
    .trim()
    .split(/[ ,]+/)
    .map(Number)
  const hasViewBox = viewBox.length === 4 && viewBox.every(Number.isFinite)
  const width = hasViewBox ? viewBox[2] : parseFloat(root.getAttribute('width') ?? '') || 1200
  const height = hasViewBox ? viewBox[3] : parseFloat(root.getAttribute('height') ?? '') || 800
  const x = hasViewBox ? viewBox[0] : 0
  const y = hasViewBox ? viewBox[1] : 0

  root.setAttribute('width', String(width))
  root.setAttribute('height', String(height))

  const backgroundRect = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'rect')
  backgroundRect.setAttribute('x', String(x))
  backgroundRect.setAttribute('y', String(y))
  backgroundRect.setAttribute('width', String(width))
  backgroundRect.setAttribute('height', String(height))
  backgroundRect.setAttribute('fill', background)
  root.insertBefore(backgroundRect, root.firstChild)

  return { source: new XMLSerializer().serializeToString(root), width, height }
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Resolve a CSS custom property to a concrete color in the element's context.
// Mermaid runs color math (khroma) on these, so they must be real values, not
// `var(...)` references — guard against an unresolved var leaking through.
function cssVar(el: Element, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  return v && !v.includes('var(') ? v : fallback
}

// Build mermaid theme variables from the live app palette so diagrams match the
// surrounding surface (works in light or dark mode). Derived from the element
// the diagram is actually rendered in, so inherited custom props resolve.
function themeFrom(el: Element) {
  const surface = cssVar(el, '--bg-raised', '#16181d')
  const base = cssVar(el, '--bg-base', surface)
  const textPrimary = cssVar(el, '--text-primary', '#e6e6e6')
  const textSecondary = cssVar(el, '--text-secondary', '#9aa0aa')
  const accent = cssVar(el, '--accent', '#3b82f6')
  const accentSubtle = cssVar(el, '--accent-subtle', base)
  const borderMid = cssVar(el, '--border-mid', '#3a3f47')
  const borderSoft = cssVar(el, '--border-soft', borderMid)
  const fontBody = cssVar(el, '--brand-font-body', 'inherit')

  return {
    background: surface,
    fontFamily: fontBody,
    // Default nodes
    primaryColor: accentSubtle,
    mainBkg: accentSubtle,
    primaryTextColor: textPrimary,
    nodeTextColor: textPrimary,
    primaryBorderColor: accent,
    nodeBorder: accent,
    // Secondary / tertiary surfaces
    secondaryColor: base,
    secondaryTextColor: textPrimary,
    secondaryBorderColor: borderMid,
    tertiaryColor: base,
    tertiaryTextColor: textPrimary,
    tertiaryBorderColor: borderMid,
    // Edges + general text
    lineColor: textSecondary,
    textColor: textPrimary,
    titleColor: textSecondary,
    edgeLabelBackground: surface,
    // Subgraph clusters
    clusterBkg: base,
    clusterBorder: borderSoft,
    // Sequence-diagram specifics
    actorBkg: accentSubtle,
    actorBorder: accent,
    actorTextColor: textPrimary,
    actorLineColor: textSecondary,
    signalColor: textSecondary,
    signalTextColor: textPrimary,
    labelBoxBkgColor: base,
    labelBoxBorderColor: borderMid,
    labelTextColor: textPrimary,
    loopTextColor: textPrimary,
    noteBkgColor: base,
    noteTextColor: textPrimary,
    noteBorderColor: borderMid,
    activationBkgColor: base,
    activationBorderColor: borderMid,
    sequenceNumberColor: surface,
  }
}

const iconProps = {
  width: 15,
  height: 15,
  viewBox: '0 0 15 15',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const ExpandIcon = () => (
  <svg {...iconProps}>
    <path d="M5.5 1.5H1.5V5.5M9.5 1.5H13.5V5.5M5.5 13.5H1.5V9.5M9.5 13.5H13.5V9.5" />
  </svg>
)
const PlusIcon = () => (
  <svg {...iconProps}>
    <path d="M7.5 3V12M3 7.5H12" />
  </svg>
)
const MinusIcon = () => (
  <svg {...iconProps}>
    <path d="M3 7.5H12" />
  </svg>
)
const ResetIcon = () => (
  <svg {...iconProps}>
    <path d="M12 7.5A4.5 4.5 0 1 1 10.7 4.3M12 1.5V4.5H9" />
  </svg>
)
const CloseIcon = () => (
  <svg {...iconProps}>
    <path d="M3.5 3.5l8 8M11.5 3.5l-8 8" />
  </svg>
)
const DownloadIcon = () => (
  <svg {...iconProps}>
    <path d="M7.5 1.5V10M4.5 7L7.5 10L10.5 7M2.5 12.5H12.5" />
  </svg>
)

function DownloadMenu({
  exporting,
  onDownload,
}: {
  exporting: boolean
  onDownload: (format: 'png' | 'svg') => void
}) {
  return (
    <DropdownMenu.Root>
      <Tooltip content="Download diagram">
        <DropdownMenu.Trigger>
          <IconButton
            variant="soft"
            color="gray"
            size="1"
            aria-label="Download diagram"
            disabled={exporting}
          >
            <DownloadIcon />
          </IconButton>
        </DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Item onSelect={() => onDownload('png')}>Download PNG</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={() => onDownload('svg')}>Download SVG</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

// Zoom controls — must live inside <TransformWrapper> to access the transform
// hooks. The percentage is editable: type a value (10–1000) and Enter / blur to
// jump to a custom zoom; Escape cancels.
const MIN_PCT = 10
const MAX_PCT = 1000

function ZoomControls({ storageKey }: { storageKey: string }) {
  const { zoomIn, zoomOut, resetTransform, centerView } = useControls()
  const [scale, setScale] = useState(1)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const cancelNext = useRef(false)

  // Track the live scale, keep the percentage display in sync, and persist per-diagram.
  useTransformEffect((ref) => {
    const s = ref.state.scale
    setScale(s)
    localStorage.setItem(storageKey, String(s))
  })

  const pct = Math.round(scale * 100)

  const commit = (value: string) => {
    const n = parseFloat(value)
    if (!Number.isNaN(n)) {
      centerView(Math.min(MAX_PCT, Math.max(MIN_PCT, n)) / 100, 200)
    }
    setEditing(false)
  }

  return (
    <Flex align="center" gap="2" style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
      <Tooltip content="Zoom out">
        <IconButton variant="soft" color="gray" onClick={() => zoomOut()} aria-label="Zoom out">
          <MinusIcon />
        </IconButton>
      </Tooltip>
      <TextField.Root
        size="1"
        aria-label="Zoom level"
        value={editing ? draft : `${pct}%`}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onFocus={(e) => {
          setEditing(true)
          setDraft(String(pct))
          e.currentTarget.select()
        }}
        onBlur={(e) => {
          if (cancelNext.current) {
            cancelNext.current = false
            setEditing(false)
            return
          }
          commit(e.currentTarget.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          else if (e.key === 'Escape') {
            cancelNext.current = true
            e.currentTarget.blur()
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            // Step the zoom like a number spinner (Shift = coarse 10% step).
            e.preventDefault()
            const base = parseFloat(editing ? draft : String(pct))
            const current = Number.isNaN(base) ? pct : base
            const step = (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1)
            const next = Math.min(MAX_PCT, Math.max(MIN_PCT, Math.round(current + step)))
            setDraft(String(next))
            centerView(next / 100, 0)
          }
        }}
        style={{ width: 64, textAlign: 'center' }}
      />
      <Tooltip content="Zoom in">
        <IconButton variant="soft" color="gray" onClick={() => zoomIn()} aria-label="Zoom in">
          <PlusIcon />
        </IconButton>
      </Tooltip>
      <Tooltip content="Reset">
        <IconButton variant="soft" color="gray" onClick={() => resetTransform()} aria-label="Reset zoom">
          <ResetIcon />
        </IconButton>
      </Tooltip>
    </Flex>
  )
}

export function Mermaid({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [initialScale, setInitialScale] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const storageKey = chartStorageKey(chart)

  useEffect(() => {
    let cancelled = false
    const host = containerRef.current ?? document.documentElement

    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      // Render node labels as native SVG <text> rather than HTML inside
      // <foreignObject>. foreignObject content taints a canvas when the diagram
      // is rasterised for PNG export ("Tainted canvases may not be exported"),
      // so htmlLabels must stay off for the download-as-PNG path to work.
      htmlLabels: false,
      // Render diagrams at their natural size; the container's overflowX:auto
      // then gives a horizontal scrollbar for wide diagrams instead of shrinking
      // them to fit (which makes labels unreadable).
      flowchart: { useMaxWidth: false, htmlLabels: false },
      sequence: { useMaxWidth: false },
      themeVariables: themeFrom(host),
    })

    const id = `mermaid-${renderCounter++}`
    mermaid
      .render(id, chart)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvg(svg)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setSvg('')
        }
      })
    return () => {
      cancelled = true
    }
  }, [chart])

  useEffect(() => {
    if (open) {
      const stored = parseFloat(localStorage.getItem(storageKey) ?? '')
      setInitialScale(Number.isNaN(stored) ? 1 : stored)
    }
  }, [open, storageKey])

  const download = async (format: 'png' | 'svg') => {
    if (!svg || exporting) return
    setExporting(true)
    setDownloadError(null)

    try {
      const host = containerRef.current ?? document.documentElement
      const background = cssVar(host, '--bg-raised', '#16181d')
      const prepared = downloadableSvg(svg, background)
      const filename = chartFileStem(chart)

      if (format === 'svg') {
        saveBlob(new Blob([prepared.source], { type: 'image/svg+xml;charset=utf-8' }), `${filename}.svg`)
        return
      }

      const svgBlob = new Blob([prepared.source], { type: 'image/svg+xml;charset=utf-8' })
      const sourceUrl = URL.createObjectURL(svgBlob)
      try {
        const image = new Image()
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve()
          image.onerror = () => reject(new Error('The rendered SVG could not be converted to PNG.'))
          image.src = sourceUrl
        })

        const scale = 2
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(prepared.width * scale)
        canvas.height = Math.ceil(prepared.height * scale)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas export is unavailable in this browser.')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)

        const png = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('The PNG could not be created.'))),
            'image/png',
          )
        })
        saveBlob(png, `${filename}.png`)
      } finally {
        URL.revokeObjectURL(sourceUrl)
      }
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'The diagram could not be downloaded.')
    } finally {
      setExporting(false)
    }
  }

  if (error) {
    return (
      <Box
        ref={containerRef}
        mb="4"
        p="4"
        style={{
          borderRadius: 'var(--brand-radius-lg)',
          border: '1px solid var(--border-soft)',
          backgroundColor: 'var(--bg-raised)',
        }}
      >
        <Text as="p" size="2" mb="2" style={{ color: 'var(--accent-bright)' }}>
          Diagram error: {error}
        </Text>
        <pre
          style={{
            margin: 0,
            fontSize: 'var(--brand-text-sm)',
            fontFamily: 'var(--brand-font-mono)',
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {chart}
        </pre>
      </Box>
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Box
        ref={containerRef}
        className="mermaid-diagram-container"
        mb="4"
        style={{
          position: 'relative',
          borderRadius: 'var(--brand-radius-lg)',
          border: '1px solid var(--border-soft)',
          backgroundColor: 'var(--bg-raised)',
        }}
      >
        {/* Inline diagram — click anywhere to open the zoomable fullscreen view */}
        <Box
          className="mermaid-diagram"
          onClick={() => svg && setOpen(true)}
          style={{
            padding: 'var(--sp-4)',
            overflowX: 'auto',
            textAlign: 'center',
            cursor: svg ? 'zoom-in' : 'default',
          }}
          // SVG is generated by mermaid from trusted vault content.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {svg && (
          <Flex
            className="mermaid-diagram__actions"
            gap="2"
            onClick={(event) => event.stopPropagation()}
            style={{ position: 'absolute', top: 8, right: 8 }}
          >
            <DownloadMenu exporting={exporting} onDownload={(format) => void download(format)} />
            <Tooltip content="Fullscreen">
              <IconButton
                variant="soft"
                color="gray"
                size="1"
                aria-label="Open diagram fullscreen"
                onClick={() => setOpen(true)}
              >
                <ExpandIcon />
              </IconButton>
            </Tooltip>
          </Flex>
        )}
        {downloadError && (
          <Text
            role="alert"
            size="1"
            style={{ display: 'block', padding: '0 var(--sp-4) var(--sp-3)', color: 'var(--accent-bright)' }}
          >
            Download failed: {downloadError}
          </Text>
        )}
      </Box>

      <Dialog.Content
        aria-describedby={undefined}
        style={{ maxWidth: '95vw', width: '95vw', height: '92vh', padding: 0, overflow: 'hidden' }}
      >
        <Dialog.Title
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            margin: -1,
            padding: 0,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          Diagram (zoomable)
        </Dialog.Title>
        <Box
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            backgroundColor: 'var(--bg-raised)',
            borderRadius: 'inherit',
            overflow: 'hidden',
          }}
        >
          <TransformWrapper minScale={0.1} maxScale={10} initialScale={initialScale} centerOnInit limitToBounds={false} wheel={{ disabled: true }}>
            <ZoomControls storageKey={storageKey} />
            <Box style={{ position: 'absolute', top: 12, right: 52, zIndex: 2 }}>
              <DownloadMenu exporting={exporting} onDownload={(format) => void download(format)} />
            </Box>
            <Dialog.Close>
              <IconButton
                variant="soft"
                color="gray"
                aria-label="Close"
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}
              >
                <CloseIcon />
              </IconButton>
            </Dialog.Close>
            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            </TransformComponent>
          </TransformWrapper>
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  )
}
