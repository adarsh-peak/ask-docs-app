import type { CSSProperties } from 'react'
export type WorkspaceIconName = 'folder' | 'file' | 'chat' | 'graph' | 'activity' | 'moon' | 'sun' | 'plus' | 'search' | 'more'
export function WorkspaceIcon({ name, size = 20, style }: { name: WorkspaceIconName; size?: number; style?: CSSProperties }) {
  const paths = {
    folder: <path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />,
    file: <><path d="M6 3h8l4 4v14H6Z" /><path d="M14 3v5h4M9 12h6M9 16h6" /></>,
    chat: <path d="M21 11c0 5-4 8-9 8l-5-1-4 3 1-6a8 8 0 1 1 17-4Z" />,
    graph: <><circle cx="12" cy="4" r="2.5"/><circle cx="4" cy="19" r="2.5"/><circle cx="20" cy="19" r="2.5"/><path d="m11 7-6 9m8-9 6 9M7 19h10"/></>,
    activity: <path d="M4 20v-5m5 5V9m6 11V4m5 16V1" />,
    moon: <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" />,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, ...style }}>{paths[name]}</svg>
}
