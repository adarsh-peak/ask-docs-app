import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as registry from '../src/components/save-coordinator.ts'

const source = readFileSync(new URL('../src/components/DocViewer.tsx', import.meta.url), 'utf8')
const handler = source.match(/async function handleDelete\(\) \{([\s\S]*?)\n  \}/)[1]
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
// Execute the actual handler with its UI/API dependencies, without a DOM dependency.
function remove(path, deleteDoc, { editing = false } = {}) {
  const errors = []
  const run = new AsyncFunction('path', 'editing', 'deleting', 'setError', 'deleteDoc', 'onDelete', 'deleteDocumentAfterSave', handler)
  return { errors, done: run(path, editing, false, e => errors.push(e), deleteDoc, () => {}, registry.deleteDocumentAfterSave) }
}

test('delete waits for earlier mount writes and latest queued draft; discards only after backend success', async () => {
  const path = 'delete-pending.md'; const save = deferred(); const deletion = deferred(); const events = []; let active = false
  const q = registry.getDocumentSaveCoordinator(path, '', async content => {
    active = true; events.push(content); await save.promise; active = false
  })
  q.update('first'); const pending = q.flush(); q.update('latest')
  const result = remove(path, async () => {
    assert.equal(active, false); assert.equal(q.isDirty(), false)
    events.push('delete'); await deletion.promise
  })
  await new Promise(setImmediate)
  assert.deepEqual(events, ['first'])
  save.resolve(); await pending; await new Promise(setImmediate)
  assert.deepEqual(events, ['first', 'latest', 'delete'])
  assert.equal(registry.getDocumentSaveCoordinator(path, 'latest', async () => {}), q)
  deletion.resolve(); await result.done
  assert.deepEqual(result.errors, [])
  assert.notEqual(registry.getDocumentSaveCoordinator(path, '', async () => {}), q)
})

test('failed pending save prevents deletion and preserves recoverable draft', async () => {
  const path = 'delete-save-failure.md'; let deleted = false
  const q = registry.getDocumentSaveCoordinator(path, '', async () => { throw Error('save offline') })
  q.update('recover me'); await q.flush()
  const result = remove(path, async () => { deleted = true }); await result.done
  assert.equal(deleted, false); assert.match(result.errors.join(), /save offline/)
  assert.equal(registry.getDocumentSaveCoordinator(path, '', async () => {}), q)
  assert.equal(q.getDraft(), 'recover me')
})

test('backend deletion failure retains registry entry', async () => {
  const path = 'delete-backend-failure.md'
  const q = registry.getDocumentSaveCoordinator(path, 'saved', async () => {})
  const result = remove(path, async () => { throw Error('delete offline') }); await result.done
  assert.match(result.errors.join(), /delete offline/)
  assert.equal(registry.getDocumentSaveCoordinator(path, 'saved', async () => {}), q)
})

test('editing guards handler and disables Delete; deletion disables entering edit', async () => {
  let deleted = false
  const result = remove('editing.md', async () => { deleted = true }, { editing: true }); await result.done
  assert.equal(deleted, false)
  assert.match(source, /DropdownMenu.Item[^>]*disabled=\{editing \|\| deleting\}[^\n]*>Delete file/)
  assert.match(source, /disabled=\{deleting\}[\s\S]*?aria-label="Edit markdown"/)
})

test('registry flush of absent path succeeds; discard refuses dirty or active saves', async () => {
  assert.deepEqual(await registry.flushDocumentSave('not-registered.md'), { ok: true })
  const path = 'discard-pending.md'; const gate = deferred()
  const q = registry.getDocumentSaveCoordinator(path, '', () => gate.promise)
  q.update('draft'); assert.equal(registry.discardDocumentSave(path), false)
  const pending = registry.flushDocumentSave(path)
  assert.equal(registry.discardDocumentSave(path), false)
  gate.resolve(); assert.deepEqual(await pending, { ok: true })
  assert.equal(registry.discardDocumentSave(path), true)
})

test('pending DELETE locks remounts, drafts and autosave; success invalidates stale handles', async () => {
  const path = 'remount-delete.md'; const gate = deferred(); const writes = []; let exists = true
  const q = registry.getDocumentSaveCoordinator(path, 'saved', async s => { writes.push(s); exists = true })
  const result = remove(path, async () => { await gate.promise; exists = false })
  await new Promise(setImmediate)
  // A new viewer mounts while the backend DELETE is unresolved.
  const remounted = registry.getDocumentSaveCoordinator(path, 'saved', async () => { throw Error('second writer') })
  remounted.update('recreate me'); await remounted.flush()
  assert.deepEqual(writes, [], 'a remount must not start autosave during DELETE')
  assert.equal(remounted.getDraft(), 'saved')
  assert.equal(registry.isDocumentDeleting(path), true)
  const duplicate = remove(path, async () => { throw Error('duplicate delete reached backend') })
  await duplicate.done
  assert.match(duplicate.errors.join(), /delet/i)
  gate.resolve(); await result.done
  assert.deepEqual(result.errors, [])
  assert.equal(registry.isDocumentDeleting(path), false)
  q.update('late cleanup'); await q.flush()
  assert.deepEqual(writes, []); assert.equal(exists, false)
  assert.notEqual(registry.getDocumentSaveCoordinator(path, '', async () => {}), q)
})

test('path lock is synchronous, observable on remount, and save failure unlocks without losing draft', async () => {
  const path = 'lock-failed-save.md'; const gate = deferred(); const states = []
  let fail = true; let deleted = false
  const q = registry.getDocumentSaveCoordinator(path, '', async () => { await gate.promise; if (fail) throw Error('offline') })
  q.update('retain draft')
  const off = registry.subscribeDocumentDeletions(() => states.push(registry.isDocumentDeleting(path)))
  const result = remove(path, async () => { deleted = true })
  assert.equal(registry.isDocumentDeleting(path), true)
  q.update('blocked replacement'); assert.equal(q.getDraft(), 'retain draft')
  gate.resolve(); await result.done
  assert.equal(deleted, false); assert.match(result.errors.join(), /offline/)
  assert.equal(registry.isDocumentDeleting(path), false); assert.equal(q.isDirty(), true)
  assert.deepEqual(states, [true, false]); off()
  fail = false; q.update('retry'); assert.equal((await q.flush()).ok, true)
})

test('backend failure unlocks the same coordinator and permits later editing', async () => {
  const path = 'lock-failed-delete.md'; const gate = deferred(); const writes = []
  const q = registry.getDocumentSaveCoordinator(path, 'saved', async s => writes.push(s))
  const result = remove(path, async () => { await gate.promise; throw Error('backend failed') })
  await new Promise(setImmediate)
  q.update('blocked'); await q.flush(); assert.deepEqual(writes, [])
  gate.resolve(); await result.done
  assert.equal(registry.isDocumentDeleting(path), false)
  assert.equal(registry.getDocumentSaveCoordinator(path, 'saved', async () => {}), q)
  q.update('allowed'); await q.flush(); assert.deepEqual(writes, ['allowed'])
})

test('remounted viewer subscribes to path lock and guards manual and automatic edit entry', () => {
  assert.match(source, /useSyncExternalStore\(/)
  assert.match(source, /subscribeDocumentDeletions/)
  assert.match(source, /isDocumentDeleting\(path\)/)
  assert.match(source, /if \(!deleting && !loading/)
  assert.match(source, /onClick=\{\(\) => \{ if \(isDocumentDeleting\(path\)\) return;/)
  assert.doesNotMatch(source, /\[deleting, setDeleting\]/)
})

test('deletion of an unregistered path blocks new coordinators until completion', async () => {
  const path = 'no-coordinator-delete.md'; const gate = deferred()
  const pending = registry.deleteDocumentAfterSave(path, () => gate.promise)
  assert.equal(registry.isDocumentDeleting(path), true)
  assert.throws(() => registry.getDocumentSaveCoordinator(path, '', async () => {}), /deletion/)
  gate.resolve(); assert.equal((await pending).ok, true)
  assert.equal(registry.isDocumentDeleting(path), false)
  assert.equal(registry.getDocumentSaveCoordinator(path, '', async () => {}).getDraft(), '')
})

test('cleanup and discard cannot evict a locked coordinator; subscribed stale handles retire', async () => {
  const path = 'locked-cleanup.md'; const gate = deferred()
  const q = registry.getDocumentSaveCoordinator(path, 'saved', async () => { throw Error('unexpected write') })
  const off = q.subscribeDraft(() => {})
  const pending = registry.deleteDocumentAfterSave(path, () => gate.promise)
  registry.cleanupDocumentSaveRegistry()
  assert.equal(registry.discardDocumentSave(path), false)
  assert.equal(registry.getDocumentSaveCoordinator(path, 'stale server', async () => {}), q)
  assert.equal(q.getDraft(), 'saved')
  gate.resolve(); assert.equal((await pending).ok, true)
  assert.equal(q.getDraft(), '')
  assert.equal(q.update('stale'), false); assert.equal((await q.flush()).ok, false)
  off()
})
