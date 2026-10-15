---
name: "Ask Docs — Tabbed Reference"
description: "A working reference manual with cream pages, dark ink, and colored fore-edge section tabs."
colors:
  bg-base: "#f1eddf"
  bg-surface: "#faf6e9"
  bg-raised: "#eee8d7"
  bg-overlay: "#fffbee"
  text-primary: "#24251e"
  text-secondary: "#56574b"
  text-muted: "#686759"
  text-disabled: "#918e80"
  border-subtle: "#d8d1be"
  border-soft: "#c9c0aa"
  border-mid: "#a39c87"
  accent: "#705400"
  accent-bright: "#654b00"
  accent-dim: "#806000"
  accent-subtle: "#f8e8a7"
  accent-border: "#d3b540"
  accent-contrast: "#252417"
  bg-hover: "#eae3cf"
  bg-active: "#f3dfa0"
  accent-hover: "#594300"
  accent-active: "#493600"
  border-hover: "#96917c"
  border-focus: "#7d5c00"
  success: "#3d6846"
  warning: "#806000"
  error: "#a3332d"
  info: "#27646d"
  success-bg: "#e2eadb"
  warning-bg: "#f6e8b4"
  error-bg: "#f5e2d9"
  info-bg: "#e1e9e4"
  success-border: "#99b49a"
  warning-border: "#cbb367"
  error-border: "#d3a395"
  info-border: "#94b3b3"
  bookmark-yellow: "#ffd348"
  bookmark-orange: "#ff921f"
  bookmark-green: "#70ad58"
  bookmark-teal: "#16afba"
  bookmark-ink: "#202411"
  tab-yellow: "#f2c83c"
  tab-orange: "#e38a42"
  tab-green: "#91ad6a"
  tab-teal: "#73b1ab"
  tab-blue: "#8ca4bd"
  tab-violet: "#b3a0c5"
  tab-ink: "#252719"
  dark-bg-base: "#232720"
  dark-bg-surface: "#2b3028"
  dark-bg-raised: "#363b31"
  dark-bg-overlay: "#32382e"
  dark-text-primary: "#f1ebd9"
  dark-text-secondary: "#d0cbb9"
  dark-text-muted: "#b6b09d"
  dark-text-disabled: "#827f70"
  dark-border-subtle: "#484d3e"
  dark-border-soft: "#5a5f4d"
  dark-border-mid: "#777c66"
  dark-accent: "#e8c75b"
  dark-accent-bright: "#f4d777"
  dark-accent-dim: "#d7b64a"
  dark-accent-subtle: "#4d472a"
  dark-accent-border: "#827744"
  dark-accent-contrast: "#24251e"
  dark-bg-hover: "#3b4034"
  dark-bg-active: "#514b2b"
  dark-accent-hover: "#f5da80"
  dark-accent-active: "#d8b34f"
  dark-border-hover: "#929880"
  dark-border-focus: "#e8c75b"
  dark-success: "#a4c68f"
  dark-warning: "#e8c75b"
  dark-error: "#f0a38a"
  dark-info: "#a4d2ce"
  dark-success-bg: "#34432e"
  dark-warning-bg: "#484227"
  dark-error-bg: "#4b332b"
  dark-info-bg: "#2f4240"
  dark-success-border: "#617954"
  dark-warning-border: "#7e7141"
  dark-error-border: "#8d5a45"
  dark-info-border: "#5c807b"
typography:
  display:
    fontFamily: "Gentium Book Plus, Georgia, serif"
    fontSize: "clamp(36px, 4vw, 58px)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-.025em"
  headline:
    fontFamily: "Gentium Book Plus, Georgia, serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Libre Caslon Text, Georgia, serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.85
  label:
    fontFamily: "Barlow, sans-serif"
    fontSize: "16px"
    fontWeight: 500
  metadata:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "10px"
    lineHeight: 1
rounded:
  sm: "3px"
  nav: "4px"
  md: "5px"
  lg: "8px"
  full: "9999px"
spacing:
  2: "0.5rem"
  4: "1rem"
components:
  button-new-document:
    backgroundColor: "{colors.bookmark-yellow}"
    textColor: "{colors.tab-ink}"
    height: "44px"
    padding: "0 20px"
  navigation-active:
    backgroundColor: "{colors.tab-yellow}"
    textColor: "{colors.tab-ink}"
    rounded: "{rounded.nav}"
    padding: "10px 17px"
    typography: "{typography.label}"
  section-tab:
    backgroundColor: "{colors.bookmark-yellow}"
    textColor: "{colors.bookmark-ink}"
    padding: "20px 15px"
  file-selected:
    backgroundColor: "{colors.accent-subtle}"
    textColor: "{colors.text-primary}"
  status-indexed:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success}"
    rounded: "{rounded.full}"
    padding: "4px 7px"
    typography: "{typography.metadata}"
  reading-surface:
    backgroundColor: "{colors.bg-surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
---

# Design System: Ask Docs

## Overview

**Creative North Star: "Tabbed Reference"**

**A personal reference manual for saved context.**
  A working reference manual: the document is the page, and section headings become colored fore-edge tabs. Cream surfaces, dark ink, regular-width navigation, and book-serif reading text give saved context an independent, bookish identity. Warm ink surfaces carry the same hierarchy in dark mode.

**Key Characteristics:**
- **Cream reading surfaces and warm dark mode.**
- **Regular-width controls, book-serif headings, and generous reading leading.**
- **Yellow selection and a dynamic colored section rail.**

**This is a code-derived visual reference.**
  It records the current implementation; it does not certify every application workflow. Product intent is in `PRODUCT.md`; the selected first-surface contract is in `tabbed-reference-brief.md`.

## Colors

**Yellow marks the active board and current navigation.**
  `tab-yellow` and `tab-ink` pair on active masthead destinations. Selected files use `accent-subtle` with primary text. The desktop section board uses solid bookmark yellow; the New document action uses saturated bookmark yellow. The darker `accent` family supports links and emphasis on cream surfaces.

**Saturated yellow, orange, green, and teal identify successive sections.**
  The four `bookmark-*` section colors remain unchanged across themes. Their order is positional; status colors use separate success, warning, error, and info families.

**Cream and warm ink form the neutral system.**
  The unprefixed frontmatter colors describe light mode. `dark-*` entries are the corresponding `[data-theme="dark"]` overrides, applied to the same runtime CSS variable names. Surface, raised, overlay, text, and border roles remain consistent.

## Typography

**Local font families divide reading, operation, and the wordmark.**
  Gentium Book Plus supplies bold headings; Libre Caslon Text supplies prose; Barlow supplies navigation, controls, and tables; Barlow Condensed is reserved for the wordmark. Barlow weights (400/500/600/700) are self-hosted with an OFL license notice. System monospace handles paths, code, and compact metadata. Font files and their license notices live in `frontend/public/fonts/`; `fonts.css` uses `font-display: swap`.

**Headings create a book page, while prose keeps a steady rhythm.**
  Frontmatter captures document H1, H2, reading body, navigation label, and metadata roles. H3 uses (23px/1.3). At the reading breakpoint, paragraphs and list items use (14px/1.85), H1 (36px), and H2 (27px). Bold prose uses weight (700).

## Layout

**The masthead frames independently scrolling files and reading content.**
  Desktop navigation starts at a minimum masthead height of (74px), with horizontal padding (32px) and vertical padding (16px). The files sidebar is `clamp(240px, 19vw, 288px)` and collapses to (40px). Reading content fills the available width without a maximum-width cap, with desktop horizontal gutters of (32px) and mobile gutters of (20px).

**Scrolling remains available with hidden scrollbars.**
  Global scrollbar styling hides the scrollbar chrome without disabling the independently scrollable files, document, code, or mobile section row.

**The fore-edge board occupies the document’s right side.**
  Its width is (48px), with (48px) reserved beside the reading scroller. Desktop tabs sit flush vertically with a preferred height of (140px), shrinking down to (64px) when necessary. Below (760px), the sidebar stacks above the document and caps at (32vh); section navigation becomes a horizontally scrolling row. Masthead spacing tightens at (1200px), navigation wraps to a full row at (1000px), and search takes its own row at (640px). The mobile New document button shows only its plus icon and retains its accessible name.

## Elevation & Depth

**Rules and tonal surfaces establish the page hierarchy.**
  Thin borders separate masthead, shelves, headings, and controls. Three warm shadow tokens support elevated surfaces; exact values are recorded in the sidecar. Desktop bookmarks use a pronounced offset cast shadow and an inset outer-edge highlight, with bold text and a (5px) outward extension for the current section. The actual desktop reading scroller has a rounded top-right corner (20px) and a CSS filter drop-shadow following its shape, with a right border separating it from the solid yellow board. Mobile selection uses an inset bottom ink marker.

## Shapes

**Small corners keep ordinary controls crisp.**
  The radius vocabulary is recorded in frontmatter. The desktop reading scroller rounds its top-right corner (20px). Desktop section tabs have rounded outer right corners (10px); mobile tabs round the top corners (4px). Status chips retain fully rounded ends. The document itself remains a continuous reading surface.

## Components

**Navigation uses a yellow current destination and a neutral hover surface.**
  The masthead exposes Files, Chat, Graph, and Activity with inline SVG icons. Chat opens `/ask`; the root route opens Files. Current navigation is expressed with `aria-current="page"`. Labels are uppercase with weight (500).

**Section tabs are generated from the document.**
  The outline reads H1–H3, creates unique heading IDs, and displays the first four H2 tabs, falling back to available H1–H3 headings when no H2 exists. Contents retains every discovered heading. The first leading H1 is labelled Overview. Scroll position selects the nearest represented section; activating a tab scrolls and focuses its heading. Reduced-motion preference switches navigation to immediate scrolling.

**Masthead actions connect directly to the workspace.**
  Submitting Search documents navigates to Files with the search query in route state. New document opens the Files creation dialog through route state. The moon/sun button toggles the shared theme. Index and API-key controls live in Workspace settings.

**The compact Files header keeps browsing controls together.**
  Files, plus, and an ellipsis form the header. The ellipsis popover contains search, project and updated filters, and counts. An active tint marks a search or filter; Clear search & filters remains visible outside the popover while either is active.

**File rows use generous spacing and explicit document icons.**
  Rows have a minimum height of (32px), an (8px) icon gap, and rounded corners (4px). Folder labels use (14px), weight (500), and colored filled icons derived from the top-level path; file labels use (14px), outlined icons, and actual filenames. Folder indentation is (10px + 18px per depth); file indentation is (26px + 18px per depth). Selection uses the accent-subtle surface without a left rule. Search in the options popover retains the compact Radix size-1 field.

**Document actions stay above the reading column.**
  The toolbar shows a Files › folder › filename breadcrumb, an outlined Edit Markdown button, and an outlined Document actions ellipsis. The dropdown contains Copy Markdown, Delete file, and Document details with index status, timestamps, chunks, and tags. Delete opens its confirmation dialog. The breadcrumb truncates long paths and wraps above actions on mobile. Reading position is captured when editing starts and restored when returning to reading.

**Status chips describe metadata without competing with headings.**
  Indexed uses the success family; preview and not-indexed use the accent family. Monospace labels and pill silhouettes distinguish metadata from document prose.

**The sidecar provides representative live primitives.**
  Its scoped HTML/CSS specimens cover navigation, section buttons, selected files, indexed chips, search fields, the New document action, and the reading surface. They use inherited CSS tokens with standalone fallbacks; they are visual specimens rather than React behavior replicas. Sources: `frontend/src/index.css`, `fonts.css`, `components/FilesView.css`, `components/BlogPost/BlogPost.css`, `DocOutline.tsx`, `DocViewer.tsx`, `Header.tsx`, `FolderTree.tsx`, `FilesView.tsx`, `WorkspaceIcon.tsx`, and `App.tsx`.

## Do's and Don'ts

- **Do keep reading text in Libre Caslon Text and navigation in Barlow.**
- **Do use the semantic theme variables so light and dark modes stay coordinated.**
- **Do derive section labels from document headings and retain the complete Contents menu.**
- **Do preserve keyboard focus, reduced-motion behavior, and narrow-screen scrolling.**

- **Don't copy Notion or Obsidian as visual references.**
- **Don't replace real document headings with mockup copy.**
- **Don't use section colors as success, warning, or error semantics.**

[[product-context]]
