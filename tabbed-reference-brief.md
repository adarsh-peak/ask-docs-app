# Tabbed Reference — UI revamp

## Overview

**A personal document workspace for reviewing and editing context saved through MCP.**
- Mode: Read for documents; Operate for navigation and editing.
- Preserve Markdown, wiki-links, diagrams, file operations, search, chat, graph, and activity.
- Approved reference: `.impeccable/mocks/decision/tabs.png`.

## Direction contract

**THESIS:** A working reference manual: the document is the page, section headings become its colored fore-edge tabs.

**OWN-WORLD:** Cream reading surfaces, dark ink, condensed navigation, book-serif headings and prose, yellow active board and orange/green/teal section tabs. Dark mode uses warm ink surfaces. Crisp rules and compact ordinary controls.

**STORY:** Find a file, read comfortably, jump to a section, edit Markdown, and return to reading without losing context.

**FIRST VIEWPORT:** Compact full-width masthead; project/file navigation at left; breadcrumb and edit controls above the single reading column; visible colored tabs at right. Metadata is secondary. Mobile uses horizontally scrollable section navigation.

**FORM:** Tabbed Reference, selected catalog challenger `rw-manual-acetate-tab-board`. seed: none (unavailable). The owner selected this comp and explicitly authorized implementation after confirming the brief. Existing real document content takes precedence over generated mockup wording.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implementation Details

**Retain the current React application and service contracts.**
- Replace presentation, improve document wayfinding, and preserve current save/delete/create behavior.
- Bundle fonts locally. Keep source code and tables usable at narrow widths.

[[product-context]]
