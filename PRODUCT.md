# Ask Docs — Product

<!-- impeccable:product-schema 1 -->

## Overview

**Ask Docs is Adarsh’s personal source of truth for context.**
- Save and manage knowledge so it remains available for future reference.

## Platform

web

## Users

**The product serves its owner’s personal workflow.**
- No broader customer audience or team workflow has been confirmed.

## Operating Context

**Most interaction happens through MCPs; the UI supports document review and occasional Markdown editing.**
- Reading and editing saved context are the confirmed human-facing priorities.
- Chat, file browsing, graph exploration, and activity views exist in the current implementation.

## Product Purpose

**Keep saved context accessible as one personal source of truth.**
- Success means returning to useful context, reviewing it comfortably, and correcting it when needed.

## Brand Commitments

**Ask Docs needs its own bold identity.**
- Notion and Obsidian were purpose analogies, explicitly rejected as visual influences.
- The owner requests a UI/UX revamp and considers the current appearance generic and AI-generated.
- The owner requested a bookish, old-document character and selected the Tabbed Reference visual direction during shaping. The detailed visual system belongs in the design brief.

## Capabilities and Constraints

**The revamp starts from the existing working application.**
- Repository evidence: React web frontend, Python services, Markdown files, MCP integration, search, and source-backed chat.
- Preserve product functionality while shaping the interface; backend changes are outside the requested design work.
- Device priorities and binding accessibility requirements remain unconfirmed.

## Product Principles

**Make saved context the center of the human experience.**
- Prioritize reviewing documents and occasional editing.

**Give Ask Docs an independent identity.**
- Derive design decisions from its actual use rather than copying adjacent products.

**Keep the interface useful alongside MCP workflows.**
- The web UI need not assume that every interaction starts in chat.

## References

**Product intent was confirmed by the owner in this design conversation.**
- Implementation evidence: `frontend/src/App.tsx`, `frontend/src/components/FilesView.tsx`, `src/daemon.py`, and `src/mcp_server.py`.

[[product-context]]
