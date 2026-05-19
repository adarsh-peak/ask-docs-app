# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ask-docs-app** (package: `docs-rag`) is a fully containerized local RAG system that enables semantic search and chat over a personal Markdown documentation vault. It exposes an HTTP search API, an MCP server for tool discovery, and a web-based chat UI.

## Commands

### Start / Stop

```bash
# Initial setup — pulls Docker images and downloads ML models (~4.7 GB total)
./scripts/setup.sh

# Start all services
docker compose up -d

# Stop all services
docker compose down
```

### Daily Operations

```bash
# Trigger a reindex (discovers new/changed .md files)
curl -X POST http://127.0.0.1:49823/reindex

# Health check for the API service
curl http://127.0.0.1:49823/health

# View indexing stats (document count, index size, etc.)
curl http://127.0.0.1:49823/stats

# Wipe the Elasticsearch index and rebuild from scratch
curl -X POST http://127.0.0.1:49823/admin/wipe
```

### Run MCP server locally (outside Docker)

```bash
./scripts/run-mcp.sh
```

### Build Docker images manually

```bash
docker build -t docs-rag-app:latest .
docker build -f Dockerfile.agent -t docs-rag-agent:latest .
```

There are no test or lint scripts configured in this project.

## Architecture

Five services defined in `docker-compose.yml`:

| Service | Port (host) | Role |
|---|---|---|
| `docs-rag-es` | internal | Elasticsearch 8.15.3 — vector + keyword search backend |
| `docs-rag-ollama` | internal | Ollama — serves `nomic-embed-text` (embeddings) and `qwen2.5:7b-instruct` (chat) |
| `docs-rag-app` | **49823** | FastAPI daemon — indexing pipeline + HTTP search API |
| `docs-rag-mcp` | internal (8001) | MCP server (Streamable-HTTP transport) |
| `docs-rag-agent` | **52891** | Chat UI + agent loop — calls Gemini API for LLM turns |

### Source modules (`src/`)

| Module | Responsibility |
|---|---|
| `config.py` | All env-var config; single source of truth for defaults |
| `daemon.py` | FastAPI app (entry: `src.daemon:app`) — hosts `/health`, `/reindex`, `/search/rag`, `/search/keyword`, `/search/fuzzy`, `/stats`, `/admin/wipe` |
| `mcp_server.py` | MCP server — exposes three tools (`rag_search`, `keyword_search`, `fuzzy_search`); supports stdio, HTTP, and SSE transports |
| `agent.py` | FastAPI app (entry: `src.agent:app`) — chat UI backend; connects to MCP via Streamable-HTTP, uses Gemini for LLM turns |
| `indexer.py` | Walks `DOCS_ROOT`, chunks markdown files, generates embeddings via Ollama, bulk-indexes into Elasticsearch |
| `chunker.py` | Splits markdown into chunks (max 800 chars) by heading/paragraph boundaries; extracts wiki-style `[[tag]]` links and H1 title |
| `embedder.py` | Thin Ollama client for generating `nomic-embed-text` embeddings (768 dims) |
| `es_client.py` | Elasticsearch wrapper — creates index with dense_vector mapping; implements kNN, BM25, and fuzzy search with tag/folder filtering |
| `static/index.html` | Single-page chat UI served by the agent service |

### Search flow

1. Client POSTs to `/search/rag` (or `/keyword`, `/fuzzy`) with `{query, tags?, folder?, top_k?}`
2. `daemon.py` calls `embedder.py` (for RAG) then `es_client.py` to execute the search
3. Results return `{chunk_id, path, folder, title, body, tags, score}`

### MCP integration

The MCP server wraps the same three search tools so external agents (Claude Desktop, etc.) can call them. Registration URL: `http://127.0.0.1:49823/mcp` (the daemon proxies MCP over HTTP).

## Key Configuration

All settings live in `src/config.py` and are overridden via environment variables in `docker-compose.yml`:

| Variable | Default | Notes |
|---|---|---|
| `DOCS_ROOT` | `/Users/adarsh.consultant/Documents/docs` | Path to the Markdown vault |
| `ES_URL` | `http://127.0.0.1:9200` | Elasticsearch endpoint |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama endpoint |
| `EMBED_MODEL` | `nomic-embed-text` | Embedding model name |
| `EMBED_DIMS` | `768` | Must match the model's output dimensions |
| `GEMINI_MODEL` | `gemini-2.0-flash` | LLM used by the agent service |
| `MCP_TRANSPORT` | `stdio` | Set to `http` in Docker |

Directories excluded from indexing: `.rag`, `.obsidian`, `.git`, `node_modules`. Only `.md` files are indexed.
