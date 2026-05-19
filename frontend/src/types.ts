export interface Source {
  path: string
  title: string
  snippet: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  thinking?: boolean
  streaming?: boolean
  error?: boolean
  fallback?: boolean
  thinkingLabel?: string
}

export interface StatsData {
  docs_indexed: number
  chunks_indexed: number
}

export interface DocMeta {
  file: string
  path: string
  chunks: number
  title: string | null
  tags: string[]
  folder: string
}

export interface TreeFolder {
  kind: 'folder'
  name: string
  fullPath: string
  children: TreeNode[]
}

export interface TreeFile {
  kind: 'file'
  name: string
  path: string
  title: string | null
  tags: string[]
}

export type TreeNode = TreeFolder | TreeFile

export interface GraphNode {
  id: string
  label: string
  type: 'doc' | 'tag'
}

export interface GraphLink {
  source: string
  target: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}
