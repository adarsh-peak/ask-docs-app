# Handoff: Ask Docs

A RAG-powered chat interface that answers questions over a personal markdown corpus ("second brain"). Full-bleed cosmic-themed UI built on the `@adarsh_goswami/brand` design system.

---

## About the Design Files

The files in this bundle (`index.html`, `app.jsx`, `components.jsx`, `app.css`, `corpus.js`) are **design references** created as a working HTML prototype. They are not meant to be copied into production verbatim.

Your task: **recreate these designs in the consuming application's environment** — a fresh Vite + React + TypeScript project that already has `@adarsh_goswami/brand` installed as a peer-dependency-driven design system. Use Radix UI primitives where applicable and apply Tailwind v4 utilities backed by the brand's token preset.

The prototype uses inline JSX-via-Babel and plain CSS purely so it could run as a single static HTML file — none of that machinery should make it into the real implementation.

---

## Fidelity

**High-fidelity.** All colors, typography, spacing, radii, shadows, and motion timings are pulled from `@adarsh_goswami/brand` design tokens. Treat the prototype as pixel-accurate intent. Where the prototype uses raw CSS, the real implementation should swap in:

- Brand-provided components (`AgMark`, `ThemeToggle`, etc.) where they exist
- Radix UI primitives (`Dialog`, `Popover`, `Toast`, `Tooltip`, `Switch`, `ScrollArea`) where the prototype hand-rolls behavior
- Tailwind utilities (`bg-bg-surface`, `text-text-primary`, `font-display`, `rounded-xl`, etc.) instead of CSS classes / inline styles

---

## Architecture

This is a single-page application. There is no router. State is local React state. Persistence is `localStorage` only.

### Real backend (not in the prototype)
The chatbot uses RAG. The prototype fakes the LLM call against an in-memory corpus via `window.claude.complete`. The real app must:

1. Hold the user's Gemini API key in `localStorage` (key `ask-docs:gemini-api-key`)
2. Send the user's question + retrieved chunks to Gemini and stream the response
3. Receive structured citations from the backend (or parse them client-side from a constrained-output Gemini response)
4. Expose a `POST /reindex` and `DELETE /index` endpoint and surface them as the Reindex / Clear actions

The prototype's response parsing assumes the model returns JSON of shape:
```json
{
  "answer": "string with [1] [2] inline citation markers",
  "citations": [{ "id": 1, "slug": "doc-slug", "snippet": "verbatim quote from doc" }]
}
```
Treat this as the contract. Adjust to your backend's actual response shape but keep the inline-`[N]`-pill rendering.

---

## Screens / Views

There are **three top-level views** plus several overlays. Implementation should treat the gate as a separate route or top-level conditional; the chat itself is one screen with empty / conversation states.

---

### 1. API Key Gate (first-run / forgot-key)

**Purpose:** Capture the user's Gemini API key before any chat is possible. Shown when `localStorage` has no key, or when the user explicitly chooses to update.

**Layout:**
- Full viewport, cosmic background visible behind a centered glassmorphic card
- Card: `max-width: 480px`, centered both axes, padding `40px 36px 32px`
- Background: `linear-gradient(180deg, rgba(17,17,19,0.85), rgba(17,17,19,0.55))` (light: `rgba(255,255,255,0.9)` → `rgba(255,255,255,0.6)`)
- `border: 1px solid var(--border-soft)`, `border-radius: var(--brand-radius-2xl)` (24px)
- `backdrop-filter: blur(20px) saturate(150%)`
- Shadow: `0 32px 80px rgba(0,0,0,0.5)`, inset accent ring `0 0 0 1px rgba(124,110,250,0.08)`, ambient `0 0 60px rgba(124,110,250,0.12)`

**Card contents (in order, vertically stacked, centered):**

1. **Moon orb** — 44×44px, `border-radius: 50%`, gradient `radial-gradient(circle at 36% 32%, #eeeaff 0%, #b8b0f0 38%, #7c74c4 75%, #4e4890 100%)`. Inner "craters" via `::before` with two `box-shadow` dots. Glow ring `0 0 0 2px rgba(124,110,250,0.45), 0 0 24px rgba(124,110,250,0.6)`. Floats vertically via `moon-float 6s ease-in-out infinite` (translateY 0 → -6px → 0).
2. **Eyebrow** — `One last thing` flanked by 20×1px `border-mid` rules. DM Mono, 10px, `letter-spacing: 0.18em`, uppercase, `--text-muted`.
3. **Title** — `Connect your <span>Gemini</span> key` — Syne 700, 28px, `letter-spacing: -0.02em`, `line-height: 1.15`. "Gemini" is `--accent`.
4. **Sub** — `Ask Docs uses Gemini to answer questions over your notes. Your key stays on this device — we never see it.` — 14px, `--text-secondary`, `max-width: 360px`, `line-height: 1.55`.
5. **Form** (`text-align: left`):
   - **Label row** — `Gemini API key` (DM Mono, 10px, uppercase, 0.08em tracking) on the left; `Get one from AI Studio →` link on the right (DM Sans 11px, `--accent-bright`, external-link icon 10×10px, links to `https://aistudio.google.com/apikey` in a new tab).
   - **Input row** — `display: flex; align-items: center; gap: 8px; padding: 4px 4px 4px 14px;` on `--bg-base` with `1px solid --border-soft` border, `border-radius: var(--brand-radius-md)` (8px). Contains:
     - `<input type="password|text">` — DM Mono, 13px, placeholder `AIzaSy…` in `--text-muted`, no autocomplete, no spellcheck
     - `paste` button — 30px tall, padding `0 10px`, `bg-raised` background, `border-subtle` border, DM Mono 11px, calls `navigator.clipboard.readText()` and writes the trimmed value into the input
     - eye/eye-off icon button — 30×30, transparent, toggles `type` between `password` and `text`
   - **Focused state** — border becomes `--accent`, ring `0 0 0 3px var(--accent-glow)`
   - **Error state** — border `--error`, ring `0 0 0 3px var(--error-bg)`
   - **Inline error message** — 12px `--error`, prefixed with a 4×4px error-colored dot
   - **Submit button** — full-width, 44px tall, `--accent` bg, `--accent-contrast` text, DM Sans 14px/600, check icon, label `Connect & start asking`. Disabled when input is empty. Hover: `--accent-hover` + `box-shadow: 0 0 0 4px var(--accent-glow), 0 0 32px rgba(124,110,250,0.45)`.
6. **Footer pill** — `--bg-base` background, `--border-subtle` border, `border-radius: var(--brand-radius-md)`, padding `10px 14px`. Lock icon (12×12, `--success`) + `**Stored locally** · localStorage on this device only`. DM Mono 10px, `--text-muted`. The word "Stored locally" is `--text-secondary`.

**Validation:**
- Empty → `Paste your Gemini API key.`
- Less than 20 chars → `That doesn't look like a valid key — check Google AI Studio.`
- Otherwise: persist and unmount the gate

**On success:** `localStorage.setItem('ask-docs:gemini-api-key', value)`; show success toast `Gemini key saved · ready to ask`; mount the main app.

---

### 2. Main App Shell

The whole chat experience after the gate clears. Vertical flex column, 100vh, `overflow: hidden`.

#### 2a. Header (fixed, top)

- Padding `16px 24px`, `border-bottom: 1px solid --border-subtle`
- Background: `linear-gradient(180deg, rgba(10,10,11,0.6), rgba(10,10,11,0))` + `backdrop-filter: blur(12px)`
- `display: flex; align-items: center; justify-content: space-between; gap: 16px`

**Left cluster** — Wordmark
- `AgMark` (the 64×64 logo SVG from `@adarsh_goswami/brand/dist/assets/logo-mark.svg`) at **26×26**
- Beside it: `Ask Docs` — Syne 700, 17px, `letter-spacing: -0.02em`, `--text-primary`

**Right cluster** (in this order, gap 10px):

1. **Index pill** — clickable button, opens index popover.
   - `padding: 4px 10px 4px 8px`, `--bg-surface` bg, `--border-subtle` border, `border-radius: var(--brand-radius-full)`
   - Pulsing success-green dot (6×6, `0 0 8px rgba(61,214,140,0.5)` glow, `pulse 2.4s ease-in-out infinite` — opacity 0.6 → 1, scale 1 → 1.2 → 1)
   - Text: `{docCount} docs indexed` — DM Mono 10px, `letter-spacing: 0.04em`, `--text-muted`
   - Chevron-down icon 10×10 with `opacity: 0.5`

2. **Key chip** — small button showing the saved key (only when key exists).
   - `height: 32px; padding: 0 10px`, `bg-raised`, `border-soft` border, `border-radius: var(--brand-radius-md)`
   - Layout (gap 6px): key icon (12×12, `--success`) + `····` (`--text-muted`) + last-4-of-key (`--text-primary`, weight 500)
   - DM Mono 11px, `letter-spacing: 0.04em`, `--text-secondary`
   - Click opens a 260px-wide popover (see Overlay: Key popover)

3. **Theme toggle button** — 32×32, icon button, `bg-raised` with `border-soft` border. Renders the **sun** icon in dark mode, **moon** in light mode. Click toggles `data-theme="light"` on `<html>` and persists in the tweaks state.

4. **New chat button** — `height: 32px`, plus icon + "New chat" + ⌘K kbd badge (DM Mono 10px, `--bg-base` bg, `--border-soft` border, padding `1px 5px`, radius 4px). Triggers `newChat()`.

**Keyboard shortcut:** `⌘K` / `Ctrl+K` anywhere triggers New chat.

---

#### 2b. Chat region (fills remaining height)

`position: relative; flex: 1; min-height: 0; display: flex; justify-content: center;`

Inner scroll container: `flex: 1; overflow-y: auto; scroll-behavior: smooth; scrollbar-color: var(--border-soft) transparent`.

`.chat-inner`: `max-width: 760px; margin: 0 auto; padding: 32px 24px 200px`. When in empty state, padding drops to `0 24px 24px`.

Auto-scroll to bottom whenever `messages` changes.

---

#### 2c. Empty state (no messages)

Centered flex column, `min-height: calc(100vh - 220px)`, `max-width: 580px`, padding `32px 24px 24px`, `text-align: center`.

Contents in order:

1. **Moon orb** — same 56×56 moon as the gate (slightly larger). With an additional `empty-orb-ring` — an absolutely positioned `1px solid rgba(124,110,250,0.18)` ring that runs `ring-expand 4s ease-out infinite` (scale 0.8 → 1.5, opacity 0 → 0.6 → 0).
2. **Eyebrow** — `Your second brain · online` flanked by 24×1px `border-mid` rules. DM Mono 10px, `letter-spacing: 0.18em`, uppercase, `--text-muted`. Margin-bottom 16px.
3. **Hero** — `Ask anything from <span>everything</span>` then `<br>` then `you've ever written.` Syne 700, `clamp(2.4rem, 5vw, 3.2rem)`, `letter-spacing: -0.025em`, `line-height: 1`. "everything" is `--accent`.
4. **Sub** — `Every markdown note you've ever made, queryable in one breath. Answers cite the exact note and chunk they came from.` — 15px, `--text-secondary`, `max-width: 480px`, `line-height: 1.55`. Margin-bottom 36px.
5. **Suggested prompts grid** — 2-column CSS grid, `gap: 10px`, `width: 100%; max-width: 580px`. Each card:
   - `text-align: left; padding: 14px 16px; background: --bg-surface; border: 1px solid --border-subtle; border-radius: var(--brand-radius-lg)`
   - `display: flex; align-items: flex-start; gap: 10px`
   - 22×22 rounded square icon container (`--accent-subtle` bg, `--accent-border` border, 6px radius) holding a 12×12 icon
   - Inside the text column: tiny eyebrow label (DM Mono 9px, uppercase, 0.1em tracking, `--accent`) above the prompt text (DM Sans 13px, `--text-secondary`, `line-height: 1.5`)
   - Hover: `border-color: var(--accent-border); transform: translateY(-1px)`. A radial accent glow appears via `::before` (from top-left, `--accent-subtle` to transparent)

   **Default 4 suggestions** (adjust labels/text to your corpus — examples are illustrative):

   | Label | Icon | Text |
   |---|---|---|
   | Recall | sparkle | What did I conclude about pgvector vs Pinecone? |
   | Synthesize | book | Summarize my reading notes from Q1. |
   | Plan | compass | What's blocking my 2026 lifting goal? |
   | Work | briefcase | What did I commit to in my last 1:1 with Ankur? |

6. **Composer** (centered, max-width 580px, `margin: 4px auto 0`). Same composer as below but inline rather than fixed to bottom.

---

#### 2d. Composer

Two layouts: inline (empty state) and fixed (during conversation).

**Fixed layout:**
- `position: absolute; left: 0; right: 0; bottom: 0; padding: 24px 24px 28px`
- `pointer-events: none` on wrapper, `auto` on form
- Wrapper has `background: linear-gradient(180deg, transparent, var(--bg-base) 65%)` so messages fade out underneath

**The form:**
- `max-width: 720px`, `padding: 8px 8px 8px 16px`, `--bg-surface` bg, `--border-soft` border, `border-radius: 22px`
- Shadow `0 4px 24px rgba(0,0,0,0.3)` (light: `rgba(0,0,0,0.08)`)
- `display: flex; align-items: flex-end; gap: 10px`
- Textarea: `flex: 1`, `min-height: 28px`, `max-height: 200px`, `resize: none`, transparent, no border, DM Sans 15px, `line-height: 1.5`, padding `6px 0`. Placeholder `Ask your second brain anything…` in `--text-muted`. Auto-resizes via `useLayoutEffect` setting `style.height` to `scrollHeight`, capped at 200.
- Send button: 36×36 round, `--accent` bg, `--accent-contrast` icon, send-arrow SVG 16×16. Disabled when textarea is empty or `isAnswering`. Hover (enabled): `--accent-hover` bg + `box-shadow: 0 0 0 4px var(--accent-glow), 0 0 24px rgba(124,110,250,0.5)`. Disabled: `--bg-raised` bg, `--text-disabled` color.

**Focused state:** form border becomes `--accent`, with `box-shadow: 0 0 0 3px var(--accent-glow), 0 0 32px var(--accent-glow), 0 4px 24px rgba(0,0,0,0.3)`.

**Keys:** Enter submits, Shift+Enter inserts newline.

---

#### 2e. Conversation messages

A vertical flex column with `gap: 24px` between messages, `margin-bottom: 32px`.

**User message:**
- `align-self: flex-end; max-width: 80%; padding: 10px 16px`
- `background: var(--accent-subtle); border: 1px solid var(--accent-border)`
- `border-radius: 16px 16px 4px 16px` (top-left/top-right/bottom-left rounded, bottom-right pointed in)
- DM Sans 15px, `line-height: 1.5`, `white-space: pre-wrap; word-break: break-word`

**Assistant message:**
- `align-self: stretch; display: flex; gap: 16px`
- **Avatar** — 28×28 round moon (same gradient + craters as the larger orbs, but proportionally scaled). Glow `0 0 0 1px rgba(124,110,250,0.45), 0 0 12px rgba(124,110,250,0.35)`. While thinking or streaming, runs `avatar-pulse 1.6s ease-in-out infinite` (glow expands to `0 0 28px rgba(124,110,250,0.6)`).
- **Body** — DM Sans 15px, `line-height: 1.65`, `--text-primary`. Renders markdown-like content with these supported inline tokens:
  - `**bold**` → `<strong>` (weight 600)
  - `*italic*` → `<em>` (`--text-secondary`)
  - `` `code` `` → inline code (DM Mono 13px, `--bg-raised` bg, `--accent-bright` color, 4px radius, padding `1px 6px`)
  - `[N]` or `[N, M]` → citation pills (see below)
  - Block-level bullet lists (`-` or `*` at line start) and paragraphs separated by blank lines

**Thinking state** (before streaming starts):
- Shows a "thinking..." indicator instead of body text
- DM Mono 12px, `--text-muted`, `letter-spacing: 0.04em`
- Three 4×4 `--accent` dots animating `dot-blink 1.2s infinite` (translateY 0 → -2px, opacity 0.25 → 1) with 0.15s and 0.30s delays on dots 2 and 3
- Label rotates every 900ms through: `retrieving relevant chunks…`, `reading 4 notes…`, `drafting answer…`

**Streaming state:**
- Body renders progressively, word-by-word (~14-50ms per word, +80ms on citation pills)
- A blinking caret (`width: 8px; height: 1em; background: --accent; vertical-align: text-bottom`) appears at the end of the partial text, blinking via `caret-blink 1s steps(2) infinite`

**Citation pill (`[1]`)** — inline:
- `display: inline-flex; min-width: 18px; height: 18px; padding: 0 5px; margin: 0 1px 0 2px`
- `border-radius: 5px`, `--accent-subtle` bg, `--accent-border` border, `--accent-bright` text
- DM Mono 10px, weight 600
- `vertical-align: 1px`
- Hover: filled `--accent` bg, `--accent-contrast` text, `box-shadow: 0 0 0 3px var(--accent-glow)`. Active state (when its source is open in the side panel): same as hover but persistent.
- Hover spawns a tooltip:
  - Positioned above, 280px wide, `--bg-overlay` bg, `--border-soft` border, `box-shadow: var(--brand-shadow-md)`
  - Contents: doc title (Syne 600 12px), folder (DM Mono 10px, `--text-muted`), then a left-quote-prefixed snippet (DM Sans 12px, `--text-secondary`, `line-height: 1.4`)

**Answer footer** (after streaming completes, only if citations exist):
- `margin-top: 14px; padding-top: 14px; border-top: 1px dashed --border-subtle`
- **Sources strip** — horizontal `flex-wrap` row of chips
  - Label `SOURCES` (DM Mono 10px, uppercase, 0.1em tracking, `--text-muted`)
  - Each chip: `--bg-surface` bg, `--border-soft` border, `border-radius: var(--brand-radius-full)`, padding `4px 10px 4px 8px`. Contains a 14×14 numbered square (DM Mono 9px, `--accent-bright` on `--accent-subtle`) + doc title (DM Sans 12px, `--text-secondary`, ellipsis, max-width 260px). Hover: `--accent-border`, `--accent-subtle` bg, `--text-primary`.

Click on either an inline pill or a source chip opens the **Source Panel** (overlay).

---

### 3. Overlays

#### 3a. Source Panel (right-side drawer)

**Backdrop:** fixed full-viewport `rgba(10,10,11,0.55)` + `backdrop-filter: blur(4px)`. Fades in over 220ms. Click anywhere on backdrop closes.

**Panel:**
- `position: fixed; top: 0; right: 0; bottom: 0`
- `width: min(520px, 92vw)` (full width on mobile)
- `--bg-surface` bg, `border-left: 1px solid --border-soft`, `box-shadow: -24px 0 64px rgba(0,0,0,0.4)`
- Slides in via `translateX(100% → 0)` over 220ms `var(--brand-ease-out)`
- `display: flex; flex-direction: column`

**Header** — flex row, padding `18px 20px 16px`, `border-bottom: 1px solid --border-subtle`:
- Left column:
  - Tag row (8px gap):
    - `cited as [N]` — DM Mono 10px uppercase 0.08em, `--accent-bright`, `--accent-subtle` bg, `--accent-border` border, 4px radius, padding `2px 6px`
    - Folder tag — DM Mono 10px, 0.06em, `--text-muted`, `--bg-raised` bg, `--border-subtle` border, 4px radius, padding `2px 6px`
  - Title — Syne 700, 20px, `letter-spacing: -0.015em`, `--text-primary`
  - Updated — DM Mono 11px, `--text-muted`
- Right: 32×32 close icon button (X)

**Body** — scrollable, padding `20px 24px 40px`. Renders the markdown of the cited document with these styles (use Tailwind prose or a markdown component with these overrides):
- `h1` — Syne 700, 22px (first h1 has `margin-top: 0`)
- `h2` — Syne 700, 17px, `margin-top: 24px`
- `h3` — DM Mono 500, 14px, uppercase, 0.08em tracking, `--text-secondary`
- `p` — DM Sans 14px, `--text-secondary`, `line-height: 1.65`, `margin-bottom: 12px`
- `strong` — `--text-primary`, 600
- `em` — `--text-secondary`
- `ul`/`ol` — `padding-left: 22px`, same body type
- `code` (inline) — DM Mono 12px, `--bg-raised` bg, `--accent-bright`, 4px radius, padding `1px 6px`
- `pre` — `--bg-raised` bg, `--border-subtle` border, 8px radius, padding `12px 14px`, `overflow-x: auto`. `pre code` is `--text-primary`, no bg, 12px
- `blockquote` — `padding: 4px 12px`, `border-left: 2px solid --accent`, `--accent-subtle` bg, `border-radius: 0 6px 6px 0`, italic, `--text-secondary`
- `hr` — `border-top: 1px solid --border-subtle`, `margin: 18px 0`

**Cited chunk highlight:**
After mount, walk text-node ancestors looking for the first element whose text contains the first 40 chars of the citation snippet (normalized whitespace). When found:
- Add class `cited-chunk`: `padding: 2px 8px; margin-left: -10px; border-radius: 0 4px 4px 0; border-left: 2px solid --accent; background: linear-gradient(180deg, var(--accent-subtle), rgba(124,110,250,0.04))`
- Briefly flash (0 → 1.2s): start with solid `--accent` bg and `--accent-contrast` text, fade to the subtle highlight. Use `chunk-flash 1.2s var(--brand-ease-out)`.
- 100ms later, `scrollIntoView({ block: 'center', behavior: 'smooth' })`

**Close:** click backdrop, the X button, or press Escape.

---

#### 3b. Index popover (from the "docs indexed" pill)

320×auto box anchored to the pill (`top: calc(100% + 8px); right: 0`):
- `--bg-surface` bg, `--border-soft` border, `border-radius: var(--brand-radius-lg)`, `box-shadow: var(--brand-shadow-lg)`, padding 16px
- Outside click closes it

**Contents:**
1. **Header row** — database icon + `Index` (Syne 600, 14px). Margin-bottom 14px.
2. **Metric cards** — 2-col grid, gap 8px. Each card: `--bg-raised` bg, `--border-subtle` border, 8px radius, padding `10px 12px`. Big number Syne 700 22px above small label (DM Mono 10px uppercase 0.08em). Show `{docCount}` documents and `{docCount * 18}` chunks (or whatever the real counts are).
3. **Last-indexed line** — DM Mono 10px, `--text-muted`, with a 4×4 dot. Text: `last indexed {timestamp}` (relative — "just now", "2 hours ago", etc.). Margin-bottom 14px.
4. **Reindex button** — full-width, 36px tall, `--accent` bg / `--accent-contrast` text. Refresh icon spins via `spin 1s linear infinite` while reindexing. Label switches `Reindex now` ↔ `Reindexing…`. Disabled during reindex (turns to `--bg-raised` bg, `--text-secondary`, `cursor: wait`).
5. **Divider** (1px `--border-subtle`).
6. **Danger zone label** — DM Mono 10px, uppercase, 0.08em, `--error`.
7. **Clear button** — full-width, 32px, transparent, `--error` text, `--error-border` border, 8px radius. Hover: `--error-bg` background. On click, in-place expands into a confirmation card:
   - `--error-bg` bg, `--error-border` border, 8px radius, padding 12px
   - Warning text: `This wipes all embeddings. You'll need to reindex from source.` (12px, `--text-primary`, `line-height: 1.5`)
   - Two side-by-side buttons: `Yes, clear` (`--error` bg, white text) and `Cancel` (transparent, `--text-secondary`, `--border-soft`). Both 28px tall, 12px font, 4px radius.

**Reindex behavior:** while running, post toasts through phases (UI simulation in the prototype; in production, drive from real backend progress):
1. `scanning vault…` — 600ms
2. `chunking documents…` — 900ms
3. `embedding 198 chunks…` — 1400ms (interpolate the real chunk count)
4. `upserting to pgvector…` — 700ms
5. `rebuilding HNSW index…` — 500ms
Final toast: `Reindexed N documents` (kind: success). Update `lastIndexed` to `just now`.

**Clear behavior:** `docCount = 0`, `lastIndexed = 'never'`, toast: `Vector index cleared. Reindex to query again.` (kind: error). Once cleared, the composer is disabled with placeholder `Index is empty — reindex to start asking`.

---

#### 3c. Key popover (from the key chip)

260×auto box anchored to the chip:
- `--bg-surface` bg, `--border-soft` border, 12px radius, `box-shadow: var(--brand-shadow-lg)`, padding 14px

Contents:
1. Label `Gemini API key` (DM Mono 10px uppercase 0.1em, `--text-muted`)
2. Masked-display box (`--bg-raised`, `--border-subtle`, 4px radius, padding `8px 10px`): lock icon, first 6 chars (`--text-muted`), 21 dots (`--text-disabled`), last 4 chars (`--text-primary`)
3. `Update key` button — full-width 32px, `--bg-raised` bg, `--border-soft` border, edit icon, label. Triggers the gate to reappear (setting an `editingKey` flag).
4. `Forget key` — full-width 32px, transparent, `--error` text, `--error-border` border, trash icon. Triggers `localStorage.removeItem(...)` and unmounts the chat back to the gate. Toast: `Gemini key forgotten`.

---

#### 3d. Toast

Single transient pill, centered horizontally, `bottom: 24px`:
- `--bg-overlay` bg, colored border (`--success-border` / `--error-border` / `--accent-border`), `border-radius: var(--brand-radius-full)`, padding `10px 16px`
- `box-shadow: var(--brand-shadow-lg)`, DM Sans 13px, `--text-primary`
- Leading 6×6 colored dot with glow `0 0 8px <color>`
- Slides up + fades in over 240ms (`toast-in` animation). Auto-dismisses after 3.2s.

---

## Cosmic Background (persistent, every screen)

Fixed full-viewport, `z-index: 0`, `pointer-events: none`. Three layers:

1. **Primary orb** — `position: absolute; top: -20vh; right: -10vw; width: 70vw; height: 70vw` (max 1100×1100). `border-radius: 50%`. `filter: blur(60px)`. Background: `radial-gradient(circle at 30% 30%, rgba(124,110,250,0.45) 0%, rgba(124,110,250,0.20) 30%, rgba(124,110,250,0.05) 55%, transparent 75%)`. Runs `orb-breathe 18s ease-in-out infinite` (scale 1 → 1.08 → 1, translate 0 → 2%/-1%, opacity 1 → 0.85 → 1).
2. **Secondary orb** — `bottom: -30vh; left: -15vw; 60vw × 60vw`. Background uses `rgba(74,168,255,0.16)` (info blue) into `rgba(124,110,250,0.10)`. `animation-delay: -9s`.
3. **Starfield** — `position: absolute; inset: 0`. Background: ~10 stacked tiny `radial-gradient`s positioned at fixed percentages (12% 22%, 28% 64%, 47% 18%, 62% 78%, 78% 32%, 88% 70%, 18% 84%, 38% 38%, 70% 12%, 92% 50%) using `rgba(255,255,255,0.30-0.60)` and one `rgba(155,143,251,0.45)`. `opacity: 0.6`. Masked by `radial-gradient(ellipse at center, black 0%, transparent 85%)`.
4. **Vignette** — `radial-gradient(ellipse 100% 80% at 50% 50%, transparent 30%, rgba(10,10,11,0.6) 100%)` to anchor center.

**Atmosphere control** (Tweak): `subtle` / `medium` / `cosmic` adjusts orb opacity (0.55 / 0.80 / 1.0) and hides the starfield in `subtle`.

**Light theme:** orbs use deepened-accent gradients (`rgba(107,92,232,…)`), starfield is hidden, vignette switches to off-white.

---

## Interactions & Behavior

| Trigger | Effect |
|---|---|
| Land with no key in localStorage | Render gate, skip chat |
| Land with key in localStorage | Render chat directly |
| Submit gate with valid key | Persist to localStorage, show success toast, mount chat |
| Submit gate with invalid key | Show inline error, do not persist |
| Click key chip → Update | Re-show gate; submit overwrites the existing value |
| Click key chip → Forget | Remove from localStorage, return to gate |
| Empty state: click suggestion card | Submits that prompt immediately |
| Empty state: type & send | Transitions to conversation view |
| Send a message | Append user msg, append thinking-state assistant msg, call backend, when first chunk arrives switch to streaming, when done render footer with citations |
| Click inline `[N]` or source chip | Open source panel with that doc, highlight + scroll to cited chunk |
| Escape (while panel open) | Close panel |
| Click panel backdrop | Close panel |
| ⌘K / Ctrl+K | Trigger New chat (abort in-flight call, clear messages, clear composer, close panel) |
| Click index pill | Toggle index popover |
| Outside click (popover open) | Close popover |
| Click Reindex | Spin icon, run phase progression, toast each phase, success toast when done, update `lastIndexed = 'just now'` |
| Click Clear vector index → confirm | `docCount = 0`, error toast, composer disabled |
| Click theme toggle | Flip `data-theme` on `<html>`; persists via TweaksPanel |
| Submit composer while index empty | Show error toast `The index is empty — reindex before asking.`; do not send |

---

## State Management

```ts
// Top-level App state
apiKey: string                         // mirrors localStorage; '' until set
editingKey: boolean                    // forces gate re-show with key still in storage
messages: Message[]                    // see shape below
composerValue: string
isAnswering: boolean
abortRef: AbortController | null       // for cancelling in-flight call on newChat
openSource: { doc, snippet, num } | null
docCount: number
lastIndexed: string                    // relative time string
isReindexing: boolean
toast: { text, kind } | null
```

```ts
type Message =
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      content: string;                 // markdown-with-citations source
      citations: Citation[];
      thinking?: boolean;
      streaming?: boolean;
      thinkingLabel?: string;
    };

type Citation = {
  id: number;                          // 1-indexed, used as [N] marker
  slug: string;
  snippet: string;                     // verbatim from source doc, 40-180 chars
  title: string;
  folder: string;
  doc: Doc;                            // full doc for the panel
};
```

**localStorage keys used:**
- `ask-docs:gemini-api-key` — the API key
- (Tweaks panel persists its state to disk via the host protocol — in production replace with a real settings store)

---

## Design Tokens

All tokens come from `@adarsh_goswami/brand/dist/theme.css`. Reference values shown for clarity; the implementation should consume them as CSS variables or Tailwind utilities (`bg-bg-surface`, `text-text-primary`, etc.). **Do not hardcode hex values** — always go through the token.

### Colors — Dark (default)
```
--bg-base:       #0A0A0B
--bg-surface:    #111113
--bg-raised:     #18181C
--bg-overlay:    #1F1F25
--bg-hover:      #1A1A1F
--bg-active:     #212127

--border-subtle: #1E1E24
--border-soft:   #2A2A34
--border-mid:    #3A3A48
--border-hover:  #454558
--border-focus:  #7C6EFA

--text-primary:   #F0EEF8
--text-secondary: #9997AA
--text-muted:     #5C5A6E
--text-disabled:  #3A3848

--accent:         #7C6EFA   (violet-indigo, the signature brand color)
--accent-bright:  #9B8FFB
--accent-dim:     #4A3FCC
--accent-hover:   #8D80FB
--accent-active:  #6B5CE8
--accent-contrast:#FFFFFF
--accent-glow:    rgba(124,110,250,0.15)
--accent-subtle:  rgba(124,110,250,0.08)
--accent-border:  rgba(124,110,250,0.20)

--success: #3DD68C  --success-bg/border: 0.08/0.20 alpha
--warning: #F5A623  --warning-bg/border
--error:   #F2546A  --error-bg/border
--info:    #4AA8FF  --info-bg/border
```

### Colors — Light (when `data-theme="light"` on `<html>`)
The brand package provides a full light scale; everything resolves through the same token names. Notable shifts: `--accent` deepens to `#6B5CE8`, `--bg-base` becomes `#FAFAFA`, shadows lighten.

### Typography
```
--brand-font-display: 'Syne', sans-serif         (headings, hero)
--brand-font-body:    'DM Sans', sans-serif      (UI, body)
--brand-font-mono:    'DM Mono', monospace       (labels, code, technical)

Type scale (use Tailwind text-* utilities mapped to these):
xs   11px      sm   13px       base 15px
md   17px      lg   20px       xl   24px
2xl  32px     3xl  44px       4xl  60px        5xl 80px
```

Google Fonts import (already in the brand package, but re-confirm in `index.html`):
```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
```

### Spacing — multiples of 4
```
sp-1 4px   sp-2 8px   sp-3 12px   sp-4 16px   sp-5 20px   sp-6 24px
sp-8 32px  sp-10 40px sp-12 48px  sp-16 64px  sp-20 80px  sp-24 96px
```

### Radius
```
sm   4px    md   8px    lg   12px    xl   16px    2xl  24px    full 9999px
```

### Shadows
```
shadow-sm:     0 1px 2px rgba(0,0,0,0.4)
shadow-md:     0 4px 16px rgba(0,0,0,0.5)
shadow-lg:     0 12px 40px rgba(0,0,0,0.6)
shadow-accent: 0 0 24px rgba(124,110,250,0.25)
```

### Motion
```
duration-fast: 120ms
duration-base: 220ms
duration-slow: 400ms
ease-out:      cubic-bezier(0.16, 1, 0.3, 1)
ease-in-out:   cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Tweaks panel (optional in production)

The prototype exposes a floating Tweaks panel for design exploration. In production this is **not user-facing**, but the same parameters could surface in a settings dialog:

- Theme: dark / light
- Atmosphere intensity: subtle / medium / cosmic (changes orb opacity + starfield)
- Density: compact / regular (changes message gaps)
- Suggested prompts on empty state: on / off

---

## Assets

From `@adarsh_goswami/brand/dist/assets/`:
- `logo.svg` — full wordmark
- `logo-mark.svg` — AG monogram only (used in the header at 26×26)
- `favicon.svg` — page favicon

Icons used in this UI (lucide-style strokes, currentColor):
`plus, send, sun, moon, x, refresh-cw, trash-2, database, sparkle, book, compass, briefcase, calendar, chevron-down, key, eye, eye-off, check, lock, external-link, edit-2`

Recommend `lucide-react` for these in the real implementation — naming aligns and the visual weight matches.

The moon orb (used in the gate, empty state, and assistant avatar) is a CSS-only construct — a radial gradient circle plus two `box-shadow` craters in the `::before` pseudo-element. The recipe is in `app.css` under `.empty-orb`, `.gate-orb`, and `.assistant-avatar`.

---

## Files in this bundle

| File | Purpose |
|---|---|
| `index.html` | Prototype entry — references all other files |
| `app.jsx` | Top-level `App` component: state, Claude/LLM call, message orchestration |
| `components.jsx` | All UI components: header, gate, key chip, empty state, composer, messages, source panel, toast, icons |
| `app.css` | All visual styles. Heavily commented by section |
| `theme.css` | **Copy of `@adarsh_goswami/brand/dist/theme.css`** — do not re-implement; consume the npm package instead |
| `corpus.js` | Synthetic markdown corpus used by the prototype's RAG. Replace with a real ingestion pipeline |
| `assets/logo-mark.svg`, `assets/logo.svg`, `assets/favicon.svg` | Brand SVGs — also available from the npm package |
| `tweaks-panel.jsx` | Design-exploration controls — not required in production |

---

## Implementation checklist

For the developer picking this up:

- [ ] Scaffold a Vite + React + TypeScript project (per the brand package's docs)
- [ ] Install `@adarsh_goswami/brand` and peer deps (`@radix-ui/themes`, `tailwindcss@^4`, `react`, `react-dom`)
- [ ] Wire up `theme.css` and `tailwind.config.css` imports per the package README
- [ ] Wrap the app in `<Theme appearance="dark">`
- [ ] Build the **gate** as a standalone component, gate the app on `localStorage.getItem('ask-docs:gemini-api-key')`
- [ ] Build the **header** using the existing `AgMark` from the package; use Radix `Popover` for the index + key popovers
- [ ] Build the **empty state** as documented
- [ ] Build the **composer** (consider Radix `Form` primitives + an auto-resizing textarea hook); wire keyboard handlers
- [ ] Implement the **message renderer**, including the small markdown subset and citation-pill substitution
- [ ] Build the **source panel** with Radix `Dialog` (or `Sheet` if you have one) — implement the chunk highlight + scroll-into-view after open
- [ ] Wire the real **Gemini** call from `app.jsx`'s `askClaude` — the JSON contract is documented above. Use server-sent events if available for true token-by-token streaming; the prototype's `fakeStream` helper can be deleted.
- [ ] Wire real **/reindex** and **/clear** endpoints
- [ ] Add a **Toast** system (Radix `Toast` is the natural fit) and replicate the existing kind/text/auto-dismiss behavior
- [ ] Verify the **cosmic background** renders behind everything at all viewport sizes — test specifically at 1280px, 1024px, 640px, 375px
- [ ] Verify the **light theme** end-to-end (the gate, header, panels, toast)
