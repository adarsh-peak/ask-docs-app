import type { DocMeta } from '../types'

export async function fetchDocs(): Promise<DocMeta[]> {
  const r = await fetch('/docs')
  if (!r.ok) throw new Error(`/docs failed: ${r.status}`)
  return r.json()
}

export async function fetchDocContent(path: string): Promise<string> {
  const r = await fetch(`/docs/content?path=${encodeURIComponent(path)}`)
  if (!r.ok) throw new Error(`/docs/content failed: ${r.status}`)
  const j = await r.json()
  return j.content as string
}
