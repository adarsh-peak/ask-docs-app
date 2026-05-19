import type { DocMeta, TreeNode, TreeFolder, TreeFile } from '../types'

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
