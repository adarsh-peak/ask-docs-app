import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

// Lightweight integration contracts; real navigation/network behavior is checked in browser QA.
const source = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8')

test('Home is a dashboard with no cinematic import, embed, or preload', () => {
  const home = source('components/HomeView.tsx')
  assert.doesNotMatch(home, /HomeCinematic|CinematicPlayer|<iframe|ask-docs-demo|preload|prefetch/)
  assert.match(home, /Docs activity/)
  assert.match(home, /Recently updated/)
})

test('the optional teaser follows recent files and links to the walkthrough', () => {
  const home = source('components/HomeView.tsx')
  assert.match(home, /<Link\s+to="\/how-it-works"[^>]*>\s*Explore the 3D walkthrough\s*<\/Link>/)
  assert.ok(home.indexOf('How Ask Docs works') > home.indexOf('Could not load recent files.'))
  assert.match(home, /Follow a document from Markdown to a cited answer\./)
})

test('App registers the dedicated explainer and preserves Home', () => {
  const app = source('App.tsx')
  assert.match(app, /<Route path="\/how-it-works" element=\{<HowItWorksView \/>\} \/>/)
  assert.match(app, /<Route path="\/home" element=\{<HomeView \/>\} \/>/)
  assert.match(source('components/Header.tsx'), /<Link to="\/home" className="app-wordmark">/)
})

test('the explainer directly embeds the standalone film with only back navigation', () => {
  const view = source('components/HowItWorksView.tsx')
  assert.match(view, /<iframe/)
  assert.match(view, /sandbox="allow-scripts"/)
  assert.match(view, /src="\/ask-docs-demo.html"/)
  assert.match(view, /title="[^"]+"/)
  assert.match(view, /tabIndex=\{-1\}/)
  assert.match(view, /<Link to="\/home"[^>]*>Back to activity<\/Link>/)
  assert.doesNotMatch(view, /CinematicPlayer|HomeCinematic|FILM|seek|useState|useEffect|requestAnimationFrame|scrollport|<button|<progress|fetch|api\//)
})

test('obsolete playback abstractions and tests are removed', () => {
  for (const path of ['src/components/CinematicPlayer.tsx', 'src/components/CinematicPlayer.css', 'src/components/cinematic-playback.ts', 'tests/cinematic-playback.test.mjs']) {
    assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), false, path)
  }
})
