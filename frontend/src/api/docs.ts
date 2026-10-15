import type { ActivityDay, CreateDocResponse, DocContent, DocMeta, FileEntry, FileSearchResponse, SaveDocResponse } from '../types'

export async function fetchDocs(): Promise<DocMeta[]> {
  const r = await fetch('/docs')
  if (!r.ok) throw new Error(`/docs failed: ${r.status}`)
  return r.json()
}

export async function createDoc(folder: string, filename: string, tags: string[]): Promise<CreateDocResponse> {
  const r = await fetch('/docs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, filename, tags }),
  })
  if (!r.ok) {
    const detail = await r.json().catch(() => null)
    throw new Error(typeof detail?.detail === 'string' ? detail.detail : `create failed: ${r.status}`)
  }
  return r.json()
}

export async function fetchDocContent(path: string): Promise<DocContent> {
  const r = await fetch(`/docs/content?path=${encodeURIComponent(path)}`)
  if (!r.ok) throw new Error(`/docs/content failed: ${r.status}`)
  return r.json()
}

export async function deleteDoc(path: string): Promise<void> {
  const r = await fetch(`/docs?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(`delete failed: ${r.status}`)
}

export async function saveDocContent(path: string, content: string): Promise<SaveDocResponse> {
  const r = await fetch('/docs/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  })
  if (!r.ok) throw new Error(`save failed: ${r.status}`)
  return r.json()
}

export async function fetchAllFiles(): Promise<FileEntry[]> {
  const r = await fetch('/api/files')
  if (!r.ok) throw new Error(`/api/files failed: ${r.status}`)
  return ((await r.json()) as { files: FileEntry[] }).files
}

export async function fetchActivity(): Promise<ActivityDay[]> {
  const r = await fetch('/api/activity')
  if (!r.ok) throw new Error(`/api/activity failed: ${r.status}`)
  return ((await r.json()) as { activity: ActivityDay[] }).activity
}

export async function searchFiles(
  query: string,
  signal?: AbortSignal
): Promise<FileSearchResponse> {
  const r = await fetch('/api/files/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k: 20 }),
    signal,
  })
  if (!r.ok) throw new Error(`/api/files/search failed: ${r.status}`)
  return r.json()
}
