import type { DocMeta, GraphData, GraphNode, GraphLink } from '../types'

export function buildGraphData(docs: DocMeta[]): GraphData {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const tagsSeen = new Set<string>()

  for (const doc of docs) {
    nodes.push({ id: doc.path, label: doc.title ?? doc.file, type: 'doc' })

    for (const tag of doc.tags) {
      if (!tagsSeen.has(tag)) {
        nodes.push({ id: `tag:${tag}`, label: tag, type: 'tag' })
        tagsSeen.add(tag)
      }
      links.push({ source: doc.path, target: `tag:${tag}` })
    }
  }

  return { nodes, links }
}
