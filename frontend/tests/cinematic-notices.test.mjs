import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const publicDir = new URL('../public/', import.meta.url)
test('cinematic ships full MIT notices and references bundled OFL notices', () => {
  const notice = readFileSync(new URL('ask-docs-demo-LICENSES.txt', publicDir), 'utf8')
  for (const copyright of ['Copyright (c) 2026 elvarofficial and whaleyxbt', 'Copyright (c) 2010-2026 three.js authors']) assert.ok(notice.includes(copyright))
  for (const clause of ['Permission is hereby granted, free of charge', 'The above copyright notice and this permission notice', 'THE SOFTWARE IS PROVIDED "AS IS"', 'OUT OF OR IN CONNECTION WITH THE SOFTWARE']) assert.equal(notice.split(clause).length - 1, 2)
  for (const font of ['Barlow', 'Barlow-Condensed', 'Inter', 'JetBrains-Mono']) {
    assert.ok(notice.includes(`fonts/${font}-LICENSE.txt`))
    assert.match(readFileSync(new URL(`fonts/${font}-LICENSE.txt`, publicDir), 'utf8'), /SIL OPEN FONT LICENSE/)
  }
})
test('production build copies the cinematic notice verbatim', { skip: !process.env.CINEMATIC_BUILD_DIR && 'run with CINEMATIC_BUILD_DIR after scratch build' }, () => {
  for (const font of ['Inter', 'JetBrains-Mono']) {
    assert.equal(readFileSync(resolve(process.env.CINEMATIC_BUILD_DIR, `fonts/${font}-LICENSE.txt`), 'utf8'), readFileSync(new URL(`fonts/${font}-LICENSE.txt`, publicDir), 'utf8'))
  }
  assert.equal(readFileSync(resolve(process.env.CINEMATIC_BUILD_DIR, 'ask-docs-demo-LICENSES.txt'), 'utf8'), readFileSync(new URL('ask-docs-demo-LICENSES.txt', publicDir), 'utf8'))
})
