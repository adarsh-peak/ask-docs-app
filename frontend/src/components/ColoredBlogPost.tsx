import { useEffect, useRef } from 'react'
import { BlogPost } from '@adarsh_goswami/design'

interface ColoredBlogPostProps {
  content: string
}

export function ColoredBlogPost({ content }: ColoredBlogPostProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const hexRegex = /#([0-9A-Fa-f]{6})\b/g
    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      null
    )

    const nodesToReplace: { node: Text; matches: Array<{ text: string; hex: string; start: number; end: number }> }[] = []
    let currentNode: Text | null

    while ((currentNode = walker.nextNode() as Text | null)) {
      const matches: Array<{ text: string; hex: string; start: number; end: number }> = []
      let match
      while ((match = hexRegex.exec(currentNode.textContent!)) !== null) {
        matches.push({
          text: match[0],
          hex: match[0],
          start: match.index,
          end: match.index + match[0].length,
        })
      }
      if (matches.length > 0) {
        nodesToReplace.push({ node: currentNode, matches })
      }
    }

    // Replace hex codes with colored elements (in reverse order to maintain indices)
    nodesToReplace.forEach(({ node, matches }) => {
      let lastIndex = 0
      const fragment = document.createDocumentFragment()

      matches.forEach(({ text, hex, start, end }) => {
        if (start > lastIndex) {
          fragment.appendChild(
            document.createTextNode(node.textContent!.substring(lastIndex, start))
          )
        }

        const span = document.createElement('span')
        span.style.display = 'inline-flex'
        span.style.alignItems = 'center'
        span.style.gap = '6px'
        span.style.fontFamily = 'monospace'

        const colorBox = document.createElement('span')
        colorBox.style.width = '18px'
        colorBox.style.height = '16px'
        colorBox.style.backgroundColor = hex
        colorBox.style.border = '1px solid #999'
        colorBox.style.borderRadius = '2px'
        colorBox.style.display = 'inline-block'
        colorBox.style.flexShrink = '0'

        span.appendChild(colorBox)
        span.appendChild(document.createTextNode(hex))
        fragment.appendChild(span)

        lastIndex = end
      })

      if (lastIndex < node.textContent!.length) {
        fragment.appendChild(
          document.createTextNode(node.textContent!.substring(lastIndex))
        )
      }

      node.parentNode?.replaceChild(fragment, node)
    })
  }, [content])

  return <div ref={containerRef}><BlogPost content={content} /></div>
}
