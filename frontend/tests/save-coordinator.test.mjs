import test from 'node:test'
import assert from 'node:assert/strict'
const module = () => import('../src/components/save-coordinator.ts')
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }

test('overlapping flushes serialize writes and share completion', async () => {
  const { createSaveCoordinator } = await module()
  const gate = deferred(); const calls = []
  const q = createSaveCoordinator('', async s => { calls.push(s); await gate.promise })
  q.update('one'); const a = q.flush(); const b = q.flush()
  assert.deepEqual(calls, ['one']); gate.resolve()
  assert.equal((await a).ok, true); assert.equal((await b).ok, true)
  assert.deepEqual(calls, ['one']); assert.equal(q.isDirty(), false)
})
test('newer draft wins and intermediate edits coalesce without overlapping', async () => {
  const { createSaveCoordinator } = await module()
  const gates = [deferred(), deferred()]; const calls = []; const persisted = []
  const q = createSaveCoordinator('', async s => { calls.push(s); await gates[calls.length - 1].promise }, s => persisted.push(s))
  q.update('old'); const done = q.flush(); q.update('middle'); q.flush(); q.update('latest')
  assert.deepEqual(calls, ['old']); gates[0].resolve(); await new Promise(setImmediate)
  assert.deepEqual(calls, ['old', 'latest']); assert.deepEqual(persisted, ['old'])
  gates[1].resolve(); assert.equal((await done).ok, true); assert.deepEqual(persisted, ['old', 'latest'])
})
test('failed close stays open and keeps draft dirty', async () => {
  const { createSaveCoordinator, closeAfterSave } = await module(); let closed = false
  const q = createSaveCoordinator('', async () => { throw Error('offline') })
  q.update('draft'); assert.equal(await closeAfterSave(q, () => { closed = true }), false)
  assert.equal(closed, false); assert.equal(q.isDirty(), true)
})
test('failure permits retry and only confirmed latest content closes', async () => {
  const { createSaveCoordinator, closeAfterSave } = await module(); let fail = true; const saved = []; let closed = 0
  const q = createSaveCoordinator('', async () => { if (fail) throw Error('offline') }, s => saved.push(s))
  q.update('first'); assert.equal((await q.flush()).ok, false); assert.deepEqual(saved, [])
  q.update('retry'); fail = false
  assert.equal(await closeAfterSave(q, () => closed++), true); assert.equal(closed, 1)
  assert.deepEqual(saved, ['retry']); assert.equal(q.isDirty(), false)
})
test('unmount final flush joins active save and persists latest draft', async () => {
  const { createSaveCoordinator } = await module(); const gate = deferred(); const calls = []
  const q = createSaveCoordinator('', async s => { calls.push(s); if (s === 'old') await gate.promise })
  q.update('old'); const active = q.flush(); q.update('last edit'); const unmount = q.flush()
  assert.deepEqual(calls, ['old']); gate.resolve(); await Promise.all([active, unmount])
  assert.deepEqual(calls, ['old', 'last edit']); assert.equal(q.isDirty(), false)
})

test('a final flush after a clean flush in the same turn still saves the new draft', async () => {
  const { createSaveCoordinator } = await module(); const calls = []
  const q = createSaveCoordinator('initial', async s => { calls.push(s) })
  const clean = q.flush(); q.update('last edit'); const final = q.flush()
  await Promise.all([clean, final])
  assert.deepEqual(calls, ['last edit']); assert.equal(q.isDirty(), false)
})

test('same path joins one queue across unmount and reopen; newest draft persists last', async () => {
  const { getDocumentSaveCoordinator } = await module()
  const gate = deferred(); const calls = []; let active = 0; let maximum = 0
  const write = async s => { active++; maximum = Math.max(maximum, active); calls.push(s); if (s === 'old') await gate.promise; active-- }
  const first = getDocumentSaveCoordinator('reopen.md', 'server', write)
  first.update('old'); const pending = first.flush(); const unmount = first.flush()
  const second = getDocumentSaveCoordinator('reopen.md', 'stale server', write)
  assert.equal(first, second); assert.equal(second.getDraft(), 'old')
  second.update('new'); const newer = second.flush()
  assert.deepEqual(calls, ['old']); gate.resolve(); await Promise.all([pending, unmount, newer])
  assert.deepEqual(calls, ['old', 'new']); assert.equal(maximum, 1); assert.equal(second.isDirty(), false)
})
test('failed unmount retains shared draft through cleanup and reopen/retry', async () => {
  const { getDocumentSaveCoordinator, cleanupDocumentSaveRegistry } = await module()
  let fail = true; const saved = []
  const write = async s => { if (fail) throw Error('offline'); saved.push(s) }
  const first = getDocumentSaveCoordinator('failure.md', 'server', write)
  first.update('recover me'); assert.equal((await first.flush()).ok, false)
  cleanupDocumentSaveRegistry()
  const reopened = getDocumentSaveCoordinator('failure.md', 'server', write)
  assert.equal(reopened, first); assert.equal(reopened.getDraft(), 'recover me')
  fail = false; assert.equal((await reopened.flush()).ok, true); assert.deepEqual(saved, ['recover me'])
})
test('success listeners unsubscribe and cannot retain stale mounted callbacks', async () => {
  const { getDocumentSaveCoordinator } = await module(); const calls = []
  const q = getDocumentSaveCoordinator('listeners.md', '', async () => {})
  const off = q.subscribe(s => calls.push('old:' + s)); off(); off()
  const offNew = q.subscribe(s => calls.push('new:' + s))
  q.update('draft'); await q.flush(); offNew(); q.update('later'); await q.flush()
  assert.deepEqual(calls, ['new:draft'])
})
test('clean reopen refreshes server content and cleanup evicts only unused clean entries', async () => {
  const { getDocumentSaveCoordinator, cleanupDocumentSaveRegistry } = await module()
  const write = async () => {}; const q = getDocumentSaveCoordinator('refresh.md', 'before', write)
  const off = q.subscribe(() => {}); cleanupDocumentSaveRegistry()
  assert.equal(getDocumentSaveCoordinator('refresh.md', 'after', write), q)
  assert.equal(q.getDraft(), 'after'); assert.equal(q.isDirty(), false)
  off(); cleanupDocumentSaveRegistry()
  assert.notEqual(getDocumentSaveCoordinator('refresh.md', 'external update', write), q)
})
