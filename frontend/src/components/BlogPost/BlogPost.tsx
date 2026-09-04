import './BlogPost.css'
import { isValidElement, lazy, Suspense, useMemo } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { visit } from 'unist-util-visit'
import type { Components } from 'react-markdown'
import type { ReactNode } from 'react'
import { Box, Flex, Heading, Separator, Text } from '@radix-ui/themes'

// Lazy-loaded so mermaid's (~400 KB gzip) core only downloads when a doc
// actually contains a ```mermaid block.
const Mermaid = lazy(() => import('./Mermaid').then((m) => ({ default: m.Mermaid })))

const HEX_SPLIT_REGEX = /(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3})(?![0-9A-Fa-f])/
const HEX_EXACT_REGEX = /^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$/

// [[Target]] / [[Target|Alias]] / [[Target#Heading]]
const WIKI_LINK_REGEX = /\[\[([^[\]]+)\]\]/g

// Leading YAML frontmatter (--- ... ---). Consumed as metadata, not rendered —
// otherwise react-markdown turns it into a stray <hr> + setext heading.
const FRONTMATTER_REGEX = /^﻿?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/

function stripFrontmatter(md: string): string {
  return md.replace(FRONTMATTER_REGEX, '')
}

// Recursively pull the raw text out of a node. rehypeHighlight may tokenize a
// code block into nested spans, so children isn't always a plain string —
// flattening recovers the original source (newlines included) for mermaid.
function extractText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (isValidElement(node)) return extractText((node.props as { children?: ReactNode }).children)
  return ''
}

function ColorSwatch({ hex }: { hex: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle' }}>
      <span
        style={{
          display: 'inline-block',
          width: '12px',
          height: '12px',
          backgroundColor: hex,
          borderRadius: '2px',
          border: '1px solid rgba(255,255,255,0.2)',
          flexShrink: 0,
        }}
      />
      {hex}
    </span>
  )
}

function injectColorSwatches(node: ReactNode): ReactNode {
  if (typeof node === 'string') {
    const parts = node.split(HEX_SPLIT_REGEX)
    if (parts.length === 1) return node
    return parts.map((part, i) =>
      HEX_EXACT_REGEX.test(part) ? <ColorSwatch key={i} hex={part} /> : part
    )
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => {
      const result = injectColorSwatches(child)
      return Array.isArray(result) ? result : [result]
    })
  }
  return node
}

// remark plugin: rewrite [[wiki links]] in text nodes into link nodes carrying a
// `wiki:` URL. Operating on the mdast text nodes (rather than the raw string)
// means links inside code spans / fenced blocks are left untouched.
function remarkWikiLink() {
  return (tree: unknown) => {
    visit(tree as never, 'text', (node: any, index, parent: any) => {
      if (parent == null || index == null) return
      const value: string = node.value
      if (!value.includes('[[')) return

      const out: any[] = []
      let last = 0
      let match: RegExpExecArray | null
      WIKI_LINK_REGEX.lastIndex = 0
      while ((match = WIKI_LINK_REGEX.exec(value)) !== null) {
        if (match.index > last) out.push({ type: 'text', value: value.slice(last, match.index) })
        const [linkPart, alias] = match[1].split('|')
        const target = linkPart.split('#')[0].trim()
        const display = (alias ?? linkPart).trim()
        if (target) {
          out.push({
            type: 'link',
            url: 'wiki:' + encodeURIComponent(target),
            children: [{ type: 'text', value: display }],
          })
        } else {
          out.push({ type: 'text', value: match[0] })
        }
        last = match.index + match[0].length
      }
      if (out.length === 0) return
      if (last < value.length) out.push({ type: 'text', value: value.slice(last) })

      parent.children.splice(index, 1, ...out)
      return index + out.length
    })
  }
}

export interface BlogPostProps {
  content: string
  /** Fill the container width instead of the centered prose max-width (e.g. doc viewer). */
  fill?: boolean
  /** Resolve a wiki-link target to an existing file path, or null if unresolved. */
  resolveWikiLink?: (target: string) => string | null
  /** Invoked when a resolved wiki-link is clicked. */
  onWikiLink?: (target: string, resolvedPath: string) => void
}

function makeAnchor(
  resolveWikiLink?: (target: string) => string | null,
  onWikiLink?: (target: string, resolvedPath: string) => void
): Components['a'] {
  return ({ href, children }) => {
    if (href?.startsWith('wiki:')) {
      const target = decodeURIComponent(href.slice('wiki:'.length))
      const resolved = resolveWikiLink?.(target) ?? null
      if (resolved) {
        return (
          <a
            className="wiki-link"
            href={resolved}
            title={resolved}
            onClick={(e) => {
              e.preventDefault()
              onWikiLink?.(target, resolved)
            }}
          >
            {children}
          </a>
        )
      }
      return (
        <span className="wiki-link wiki-link--unresolved" title={`No note found for "${target}"`}>
          {children}
        </span>
      )
    }
    return (
      <a href={href ?? '#'} style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
        {children}
      </a>
    )
  }
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <Heading
      as="h1"
      size="7"
      mb="4"
      style={{ fontFamily: 'var(--brand-font-display)', color: 'var(--text-primary)' }}
    >
      {children}
    </Heading>
  ),
  h2: ({ children }) => (
    <Heading
      as="h2"
      size="5"
      mb="3"
      mt="6"
      style={{ fontFamily: 'var(--brand-font-display)', color: 'var(--text-primary)' }}
    >
      {children}
    </Heading>
  ),
  h3: ({ children }) => (
    <Heading
      as="h3"
      size="4"
      mb="2"
      mt="5"
      style={{ fontFamily: 'var(--brand-font-display)', color: 'var(--text-primary)' }}
    >
      {children}
    </Heading>
  ),
  p: ({ children }) => (
    <Text
      as="p"
      size="3"
      mb="4"
      style={{
        fontFamily: 'var(--brand-font-body)',
        color: 'var(--text-primary)',
        lineHeight: 'var(--brand-leading-relaxed)',
        display: 'block',
      }}
    >
      {injectColorSwatches(children)}
    </Text>
  ),
  pre: ({ children }) => {
    // Fenced ```mermaid blocks arrive as <pre><code class="language-mermaid">.
    // Intercept here (not in `code`) so we render the diagram in place of the
    // code box, avoiding a <div> nested inside <pre>.
    const child = Array.isArray(children) ? children[0] : children
    if (isValidElement(child)) {
      const childClass = (child.props as { className?: string }).className ?? ''
      if (childClass.split(' ').includes('language-mermaid')) {
        return (
          <Suspense fallback={null}>
            <Mermaid chart={extractText((child.props as { children?: ReactNode }).children)} />
          </Suspense>
        )
      }
      // Fenced ```highlight blocks flag a standout/important note — render as
      // wrapped prose in the warning accent instead of a scrolling code box.
      if (childClass.split(' ').includes('language-highlight')) {
        return (
          <Box
            mb="4"
            p="4"
            style={{
              borderLeft: '3px solid var(--warning)',
              backgroundColor: 'var(--warning-bg)',
              borderRadius: '0 var(--brand-radius-md) var(--brand-radius-md) 0',
              color: 'var(--warning)',
              fontFamily: 'var(--brand-font-body)',
              fontSize: 'var(--brand-text-sm)',
              lineHeight: 'var(--brand-leading-relaxed)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {extractText((child.props as { children?: ReactNode }).children)}
          </Box>
        )
      }
    }
    return (
      <Box
        mb="4"
        style={{
          borderRadius: 'var(--brand-radius-lg)',
          border: '1px solid var(--border-soft)',
          backgroundColor: 'var(--bg-raised)',
          overflowX: 'auto',
        }}
      >
        <pre style={{ margin: 0, padding: 'var(--sp-4)' }}>{children}</pre>
      </Box>
    )
  },
  code: ({ className, children }) => {
    const isBlock = !!className?.startsWith('language-')
    if (isBlock) {
      return (
        <code
          className={className ?? ''}
          style={{
            fontSize: 'var(--brand-text-sm)',
            fontFamily: 'var(--brand-font-mono)',
            color: 'var(--text-primary)',
          }}
        >
          {children}
        </code>
      )
    }
    const hexText = typeof children === 'string' ? children : ''
    if (HEX_EXACT_REGEX.test(hexText)) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'middle' }}>
          <span
            style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              backgroundColor: hexText,
              borderRadius: '2px',
              border: '1px solid rgba(255,255,255,0.2)',
              flexShrink: 0,
            }}
          />
          <code
            style={{
              backgroundColor: 'var(--bg-raised)',
              color: 'var(--accent-bright)',
              borderRadius: 'var(--brand-radius-sm)',
              padding: '2px 6px',
              fontSize: 'var(--brand-text-sm)',
              fontFamily: 'var(--brand-font-mono)',
            }}
          >
            {children}
          </code>
        </span>
      )
    }
    return (
      <code
        style={{
          backgroundColor: 'var(--bg-raised)',
          color: 'var(--accent-bright)',
          borderRadius: 'var(--brand-radius-sm)',
          padding: '2px 6px',
          fontSize: 'var(--brand-text-sm)',
          fontFamily: 'var(--brand-font-mono)',
        }}
      >
        {children}
      </code>
    )
  },
  ul: ({ children }) => (
    <ul
      style={{
        marginBottom: 'var(--sp-4)',
        paddingLeft: 'var(--sp-4)',
        listStyleType: 'disc',
        color: 'var(--text-primary)',
        fontFamily: 'var(--brand-font-body)',
      }}
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol
      style={{
        marginBottom: 'var(--sp-4)',
        paddingLeft: 'var(--sp-4)',
        listStyleType: 'decimal',
        color: 'var(--text-primary)',
        fontFamily: 'var(--brand-font-body)',
      }}
    >
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <Text
      as="p"
      size="3"
      mb="1"
      style={{
        fontFamily: 'var(--brand-font-body)',
        color: 'var(--text-primary)',
        display: 'list-item',
      }}
    >
      {injectColorSwatches(children)}
    </Text>
  ),
  blockquote: ({ children }) => (
    <Box
      mb="4"
      pl="4"
      py="2"
      style={{
        borderLeft: '2px solid var(--accent)',
        backgroundColor: 'var(--accent-subtle)',
        borderRadius: '0 var(--brand-radius-md) var(--brand-radius-md) 0',
      }}
    >
      {children}
    </Box>
  ),
  table: ({ children }) => (
    <Box mb="4" style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--brand-text-sm)',
          fontFamily: 'var(--brand-font-body)',
        }}
      >
        {children}
      </table>
    </Box>
  ),
  th: ({ children }) => (
    <th
      style={{
        textAlign: 'left',
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-mid)',
        color: 'var(--text-primary)',
        fontWeight: 500,
      }}
    >
      {injectColorSwatches(children)}
    </th>
  ),
  td: ({ children }) => (
    <td
      style={{
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        color: 'var(--text-primary)',
      }}
    >
      {injectColorSwatches(children)}
    </td>
  ),
  hr: () => (
    <Flex my="6">
      <Separator size="4" />
    </Flex>
  ),
}

function transformUrl(url: string): string {
  return url.startsWith('wiki:') ? url : defaultUrlTransform(url)
}

export function BlogPost({ content, fill, resolveWikiLink, onWikiLink }: BlogPostProps) {
  const components = useMemo<Components>(
    () => ({ ...markdownComponents, a: makeAnchor(resolveWikiLink, onWikiLink) }),
    [resolveWikiLink, onWikiLink]
  )
  const body = useMemo(() => stripFrontmatter(content), [content])

  return (
    <article className={fill ? 'blog-post blog-post--fill' : 'blog-post'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkWikiLink]}
        rehypePlugins={[rehypeHighlight]}
        urlTransform={transformUrl}
        components={components}
      >
        {body}
      </ReactMarkdown>
    </article>
  )
}
