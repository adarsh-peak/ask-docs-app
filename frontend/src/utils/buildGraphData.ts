import type { DocMeta, GraphData, GraphNode, GraphLink } from '../types'
import { makeWikiResolver } from './wikiLink'

const WIKI_LINK_RE = /(?<!!)\[\[([^\]|#]+?)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g
const FILE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|pdf|mp4|mov|webm|mp3|wav|zip)$/i

function linkKey(source: string, target: string, type: GraphLink['type']): string {
  return `${type ?? 'link'}\u0000${source}\u0000${target}`
}

function addWeightedLink(
  linksByKey: Map<string, GraphLink>,
  source: string,
  target: string,
  type: NonNullable<GraphLink['type']>,
  label?: string
) {
  const key = linkKey(source, target, type)
  const existing = linksByKey.get(key)
  if (existing) {
    existing.value = (existing.value ?? 1) + 1
    return
  }
  linksByKey.set(key, { source, target, type, value: 1, label })
}

export function buildGraphData(
  docs: DocMeta[],
  contentByPath: Record<string, string> = {}
): GraphData {
  const nodes: GraphNode[] = []
  const linksByKey = new Map<string, GraphLink>()
  const tagsSeen = new Set<string>()
  const docPaths = new Set(docs.map(doc => doc.path))
  const resolveWikiLink = makeWikiResolver(docs.map(doc => doc.path))

  for (const doc of docs) {
    nodes.push({
      id: doc.path,
      path: doc.path,
      label: doc.title ?? doc.file,
      title: doc.title,
      type: 'doc',
      folder: doc.folder,
      tags: doc.tags,
      chunks: doc.chunks,
    })

    for (const tag of doc.tags) {
      if (!tagsSeen.has(tag)) {
        nodes.push({ id: `tag:${tag}`, label: tag, type: 'tag' })
        tagsSeen.add(tag)
      }
      addWeightedLink(linksByKey, doc.path, `tag:${tag}`, 'tag', tag)
    }

    const content = contentByPath[doc.path] ?? ''
    for (const match of content.matchAll(WIKI_LINK_RE)) {
      const target = match[1].trim()
      if (!target || FILE_EXT_RE.test(target)) continue

      const resolved = resolveWikiLink(target)
      if (!resolved || resolved === doc.path || !docPaths.has(resolved)) continue

      addWeightedLink(linksByKey, doc.path, resolved, 'wiki', target)
    }
  }

  return { nodes, links: Array.from(linksByKey.values()) }
}
