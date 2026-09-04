import type { DocMeta, TreeNode, TreeFolder, TreeFile } from '../types'

export function buildFileTree(
  paths: string[],
  metaMap: Record<string, DocMeta>,
): TreeNode[] {
  const root: TreeFolder = { kind: 'folder', name: '__root__', fullPath: '', children: [] }

  for (const filePath of paths) {
    const segments = filePath.split('/')
    let current = root

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i]
      const fullPath = segments.slice(0, i + 1).join('/')
      let folder = current.children.find(
        (n): n is TreeFolder => n.kind === 'folder' && n.name === seg,
      )
      if (!folder) {
        folder = { kind: 'folder', name: seg, fullPath, children: [] }
        current.children.push(folder)
      }
      current = folder
    }

    const meta = metaMap[filePath]
    const file: TreeFile = {
      kind: 'file',
      name: segments[segments.length - 1],
      path: filePath,
      title: meta?.title ?? null,
      tags: meta?.tags ?? [],
    }
    current.children.push(file)
  }

  function sortChildren(node: TreeFolder): void {
    node.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    node.children.forEach(child => {
      if (child.kind === 'folder') sortChildren(child)
    })
  }

  sortChildren(root)
  return root.children
}

/** Depth-first list of file paths in the same order the tree renders them (folders first, alphabetical). */
export function flattenTreeFiles(nodes: TreeNode[]): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    if (node.kind === 'folder') paths.push(...flattenTreeFiles(node.children))
    else paths.push(node.path)
  }
  return paths
}

export function buildTree(docs: DocMeta[]): TreeNode[] {
  const root: TreeFolder = { kind: 'folder', name: '__root__', fullPath: '', children: [] }

  for (const doc of docs) {
    const segments = doc.path.split('/')
    let current = root

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i]
      const fullPath = segments.slice(0, i + 1).join('/')
      let folder = current.children.find(
        (n): n is TreeFolder => n.kind === 'folder' && n.name === seg
      )
      if (!folder) {
        folder = { kind: 'folder', name: seg, fullPath, children: [] }
        current.children.push(folder)
      }
      current = folder
    }

    const file: TreeFile = {
      kind: 'file',
      name: segments[segments.length - 1],
      path: doc.path,
      title: doc.title,
      tags: doc.tags,
    }
    current.children.push(file)
  }

  function sortChildren(node: TreeFolder): void {
    node.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    node.children.forEach(child => {
      if (child.kind === 'folder') sortChildren(child)
    })
  }

  sortChildren(root)
  return root.children
}
