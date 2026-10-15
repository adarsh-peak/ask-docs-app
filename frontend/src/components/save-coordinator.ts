export type SaveResult = { ok: true } | { ok: false; error: unknown }

/** Owns persistence ordering; React lifecycle and presentation stay in the editor. */
export function createSaveCoordinator(
  initial: string,
  write: (content: string) => Promise<unknown>,
  onPersisted?: (content: string) => void,
) {
  const listeners = new Set<(content: string) => void>()
  const draftListeners = new Set<(content: string) => void>()
  if (onPersisted) listeners.add(onPersisted)
  let frozen = false
  let retired = false
  let latest = initial
  let persisted = initial
  let active: Promise<SaveResult> | null = null

  async function drain(): Promise<SaveResult> {
    while (latest !== persisted) {
      const content = latest
      try {
        await write(content)
      } catch (error) {
        return { ok: false, error }
      }
      persisted = content
      // Observer failures must never turn a successful write into a failed save.
      for (const listener of listeners) {
        try { listener(content) } catch (error) { console.error('Save listener failed', error) }
      }
    }
    return { ok: true }
  }

  async function flush(): Promise<SaveResult> {
    if (!active) active = drain().finally(() => { active = null })
    const result = await active
    // An edit/cleanup can arrive after drain completes but before its promise settles.
    if (result.ok && latest !== persisted) return flush()
    return result
  }

  return {
    update(content: string) {
      if (frozen || retired) return false
      latest = content
      for (const listener of draftListeners) listener(content)
      return true
    },
    getDraft() { return latest },
    refresh(content: string) {
      if (!frozen && !retired && !active && latest === persisted) latest = persisted = content
    },
    subscribe(listener: (content: string) => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    subscribeDraft(listener: (content: string) => void) {
      draftListeners.add(listener)
      return () => { draftListeners.delete(listener) }
    },
    canRelease() { return !frozen && !active && latest === persisted && !listeners.size && !draftListeners.size },
    isDirty() { return latest !== persisted },
    flush(): Promise<SaveResult> {
      if (frozen || retired) return Promise.resolve({ ok: false, error: new Error('Document is being deleted or has been deleted') })
      return flush()
    },
    // Only the registry transaction drains existing work while new work is frozen.
    freezeForDeletion() { frozen = true; return flush() },
    cancelDeletion() { frozen = false },
    retire() {
      if (active || latest !== persisted) return false
      retired = true
      latest = persisted = ''
      listeners.clear()
      draftListeners.clear()
      return true
    },
  }
}

/** Closing is conditional on a successful flush and the draft still being current. */
export async function closeAfterSave(
  coordinator: Pick<ReturnType<typeof createSaveCoordinator>, 'flush' | 'isDirty'>,
  close: () => void,
): Promise<boolean> {
  const result = await coordinator.flush()
  if (!result.ok || coordinator.isDirty()) return false
  close()
  return true
}

// Registry lifetime spans editor mounts. Dirty entries intentionally survive navigation
// and failures; only idle, clean entries with no mounted observers may be evicted.
const documentSaves = new Map<string, ReturnType<typeof createSaveCoordinator>>()
const deletingPaths = new Set<string>()
const deletionListeners = new Set<() => void>()

export function isDocumentDeleting(path: string | null): boolean {
  return path !== null && deletingPaths.has(path)
}

export function subscribeDocumentDeletions(listener: () => void) {
  deletionListeners.add(listener)
  return () => { deletionListeners.delete(listener) }
}

function notifyDeletionListeners() {
  for (const listener of deletionListeners) {
    try { listener() } catch (error) { console.error('Deletion listener failed', error) }
  }
}

/** The lock spans navigation, the final save, and the backend DELETE. */
export async function deleteDocumentAfterSave(
  path: string,
  remove: (path: string) => Promise<unknown>,
): Promise<SaveResult> {
  if (deletingPaths.has(path)) return { ok: false, error: new Error('Document deletion already in progress') }
  deletingPaths.add(path)
  const coordinator = documentSaves.get(path)
  // Freeze synchronously before notifying subscribers or yielding to a remount.
  const pending = coordinator?.freezeForDeletion()
  notifyDeletionListeners()
  try {
    const saved = await pending
    if (saved && !saved.ok) return saved
    if (coordinator?.isDirty()) return { ok: false, error: new Error('Document still has unsaved changes') }
    await remove(path)
    if (coordinator && !coordinator.retire()) {
      throw new Error('Could not finalize document deletion')
    }
    documentSaves.delete(path)
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  } finally {
    coordinator?.cancelDeletion()
    deletingPaths.delete(path)
    notifyDeletionListeners()
  }
}

export function getDocumentSaveCoordinator(
  path: string,
  serverContent: string,
  write: (content: string) => Promise<unknown>,
) {
  let coordinator = documentSaves.get(path)
  if (!coordinator) {
    if (isDocumentDeleting(path)) throw new Error('Document deletion already in progress')
    coordinator = createSaveCoordinator(serverContent, write)
    documentSaves.set(path, coordinator)
  } else {
    coordinator.refresh(serverContent)
  }
  return coordinator
}

export function cleanupDocumentSaveRegistry() {
  for (const [path, coordinator] of documentSaves) {
    if (coordinator.canRelease()) documentSaves.delete(path)
  }
}

/** Join any earlier editor's write queue before deleting its file. */
export async function flushDocumentSave(path: string): Promise<SaveResult> {
  const coordinator = documentSaves.get(path)
  if (!coordinator) return { ok: true }
  const result = await coordinator.flush()
  if (!result.ok) return result
  if (coordinator.isDirty()) return { ok: false, error: new Error('Document still has unsaved changes') }
  return { ok: true }
}

/** Call only after confirmed backend deletion; never drop an active or dirty draft. */
export function discardDocumentSave(path: string): boolean {
  const coordinator = documentSaves.get(path)
  if (!coordinator) return true
  if (isDocumentDeleting(path) || !coordinator.canRelease() || !coordinator.retire()) return false
  documentSaves.delete(path)
  return true
}
