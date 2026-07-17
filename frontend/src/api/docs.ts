import type { DocMeta, FileSearchResponse } from '../types'

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

export async function deleteDoc(path: string): Promise<void> {
  const r = await fetch(`/docs?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(`delete failed: ${r.status}`)
}

export async function fetchAllFiles(): Promise<string[]> {
  const r = await fetch('/api/files')
  if (!r.ok) throw new Error(`/api/files failed: ${r.status}`)
  return ((await r.json()) as { files: string[] }).files
}

export async function searchFiles(
  query: string,
  signal?: AbortSignal
): Promise<FileSearchResponse> {
  const r = await fetch('/api/files/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k: 8 }),
    signal,
  })
  if (!r.ok) throw new Error(`/api/files/search failed: ${r.status}`)
  return r.json()
}
