interface SvgViewerProps {
  path: string
  content: string
}

export function SvgViewer({ path, content }: SvgViewerProps) {
  const scaledContent = content.replace(
    /<svg([^>]*?)>/,
    (_, attrs: string) => {
      const cleaned = attrs
        .replace(/\s*width="[^"]*"/g, '')
        .replace(/\s*height="[^"]*"/g, '')
      return `<svg${cleaned} style="width:100%;height:100%;display:block;">`
    }
  )

  return (
    <div style={{
      flex: 1, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      padding: '24px 32px',
    }}>
      <p style={{
        margin: '0 0 12px', flexShrink: 0,
        fontSize: 11, fontFamily: 'var(--brand-font-mono)',
        color: 'var(--text-muted)', letterSpacing: '0.03em',
      }}>
        {path}
      </p>
      <div
        dangerouslySetInnerHTML={{ __html: scaledContent }}
        style={{
          flex: 1, minHeight: 0,
          border: '1px solid var(--gray-a6)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      />
    </div>
  )
}
