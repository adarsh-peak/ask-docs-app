# docs-rag

Fully containerized local RAG layer + MCP server + chat UI for the docs vault at `~/Documents/docs`.

## Stack

Five services brought up by one `docker compose up`:

| Container          | Image                                | Role                                                                                       |
|--------------------|--------------------------------------|--------------------------------------------------------------------------------------------|
| `docs-rag-es`      | `elasticsearch:8.15.3`               | Stores chunks, dense vectors, tag keywords. Internal only.                                 |
| `docs-rag-ollama`  | `ollama/ollama:latest`               | Hosts `nomic-embed-text` (embeddings) + `qwen2.5:7b-instruct` (chat). Internal only.       |
| `docs-rag-app`     | `docs-rag-app:latest` (built here)   | FastAPI daemon — indexing + HTTP search API. Host port **49823**.                          |
| `docs-rag-mcp`     | `docs-rag-app:latest` (same image)   | MCP server in Streamable-HTTP mode on internal port 8001 — used by the agent. Same code as the stdio MCP, just a different transport. |
| `docs-rag-agent`   | `docs-rag-agent:latest` (built here) | Chat UI + agent loop. Talks to MCP (tool discovery + invocation) and Ollama (chat). Host port **52891**. |

Only two host ports are exposed (both loopback-only): the search API on 49823 and the chat UI on 52891. Everything else is on the internal compose network.

## Ports

| Service     | Host port | Default | Override env  |
|-------------|-----------|---------|---------------|
| Search API  | yes       | 49823   | `HOST_PORT`   |
| Chat UI     | yes       | 52891   | `AGENT_PORT`  |
| Elasticsearch | no      | —       | —             |
| Ollama      | no        | —       | —             |
| MCP HTTP    | no        | —       | —             |

## First-time setup

```bash
cd ~/Documents/docs/.rag
./scripts/setup.sh
```

`setup.sh` does:
1. `docker compose up -d --build` (builds both images, starts all five containers, waits for healthchecks)
2. Pulls the embedding model `nomic-embed-text` (~270MB) into the Ollama volume
3. Pulls the chat model `qwen2.5:7b-instruct` (~4.4GB) into the Ollama volume
4. Waits for `GET /health` (search API) and `GET /healthz` (agent) to succeed

## Manual setup (after `docker compose build && docker compose up -d`)

If you started the stack manually instead of running `setup.sh`, complete these steps before anything will work:

**Step 1 — Pull the embedding model** (~270 MB, required for indexing)

```bash
docker exec docs-rag-ollama ollama pull nomic-embed-text
```

**Step 2 — Pull the chat model** (~4.4 GB, required for the chat UI)

```bash
docker exec docs-rag-ollama ollama pull qwen2.5:7b-instruct
```

**Step 3 — Set your docs path** (if your vault is not at the default `/Users/adarsh.consultant/Documents/docs`)

Stop the stack, export the variable, and restart:

```bash
docker compose down
DOCS_ROOT_HOST=/path/to/your/docs docker compose up -d
```

**Step 4 — Wait for services to be healthy, then trigger the initial index**

```bash
# Confirm the API is up
curl http://127.0.0.1:49823/health

# Index your docs into Elasticsearch
curl -X POST http://127.0.0.1:49823/reindex
```

**Step 5 — Verify**

```bash
curl http://127.0.0.1:49823/stats
```

Once stats show a non-zero document count, the stack is ready. Open the chat UI at **http://127.0.0.1:52891**.

## Chat UI

Open **http://127.0.0.1:52891** in your browser. The agent uses `qwen2.5:7b-instruct` running inside the Ollama container, with the three MCP search tools discovered over Streamable-HTTP from the `docs-rag-mcp` container.

Each `/chat` response is streamed back over Server-Sent Events:
- `token` — model output, appears in the assistant bubble
- `tool_call` — the model decided to call a search tool (shows arguments)
- `tool_result` — the search results (collapsible)
- `done` — final message
- `error` — anything that went wrong

The UI keeps conversation history client-side and replays it on each new question.

To switch models without rebuilding (e.g. for speed):

```bash
OLLAMA_MODEL=llama3.2:3b docker compose up -d agent
docker exec docs-rag-ollama ollama pull llama3.2:3b
```

## Daily use

```bash
# Health
curl http://127.0.0.1:49823/health

# Scan for new .md files and add them (idempotent — new files only, no updates/deletes)
curl -X POST http://127.0.0.1:49823/reindex

# Stats
curl http://127.0.0.1:49823/stats

# Stop / start
docker compose down
docker compose up -d
```

## Querying — HTTP search API

These are the endpoints your local LLM (or any HTTP client) hits directly. All take the same JSON shape and return a ranked list of hits.

| Endpoint           | When to use                                          |
|--------------------|------------------------------------------------------|
| `POST /search/rag`     | Semantic / paraphrased queries. Vector kNN.          |
| `POST /search/keyword` | Exact terms, identifiers, proper nouns. BM25.        |
| `POST /search/fuzzy`   | Typo-tolerant fallback when the user may have mistyped. |

Request body (all fields except `query` optional):

```json
{
  "query": "peak xv brand voice",
  "tags":  ["branding"],
  "folder": "PeakXV-Branding",
  "top_k": 5
}
```

Response:

```json
[
  {
    "path":   "PeakXV-Branding/peakxv branding doc.md",
    "title":  "Peak XV Branding Doc",
    "folder": "PeakXV-Branding",
    "tags":   ["peakxv", "branding", "voice-and-tone"],
    "snippet": "... matched chunk text, truncated to ~600 chars ...",
    "score":   0.83
  }
]
```

Examples:

```bash
# Semantic
curl -s -X POST http://127.0.0.1:49823/search/rag \
  -H 'Content-Type: application/json' \
  -d '{"query":"peak xv brand voice","top_k":3}'

# Keyword, scoped by tag
curl -s -X POST http://127.0.0.1:49823/search/keyword \
  -H 'Content-Type: application/json' \
  -d '{"query":"voting","tags":["ic-meeting"]}'

# Fuzzy (typo)
curl -s -X POST http://127.0.0.1:49823/search/fuzzy \
  -H 'Content-Type: application/json' \
  -d '{"query":"brandng"}'
```

A local LLM (Ollama, llama.cpp, etc.) can call these directly — give it tool/function definitions that match the three endpoints and let it pick.

## (Optional) MCP server — for future use

An MCP-compatible server is bundled in the image but **not registered with any client by default**. If you ever want Claude (or another MCP client) to use this stack, register it like:

```bash
claude mcp add docs-rag -- docker exec -i docs-rag-app python -m src.mcp_server
```

Or in `~/.claude.json`:

```json
{
  "mcpServers": {
    "docs-rag": {
      "command": "docker",
      "args": ["exec", "-i", "docs-rag-app", "python", "-m", "src.mcp_server"]
    }
  }
}
```

The MCP exposes the same three modes as the HTTP API, as separate tools: `rag_search`, `keyword_search`, `fuzzy_search`, each accepting optional `tags=[...]` and `folder="..."` filters.

## Sharing the stack

Everything is in this directory. To share with a teammate:

1. They clone/copy `~/Documents/docs/.rag/`
2. They override the docs path:
   ```bash
   DOCS_ROOT_HOST=/path/to/their/docs HOST_PORT=49823 ./scripts/setup.sh
   ```
3. They register the MCP the same way

To distribute as a prebuilt image (skip the build step on their end):

```bash
docker save docs-rag-app:latest | gzip > docs-rag-app.tar.gz
# they load with: docker load < docs-rag-app.tar.gz
```

## Out of scope (this phase)

- File change detection / re-embedding on edits
- Deletes when files are removed from disk
- Hybrid score fusion across the three modes (kept separate so the LLM picks)
- Authentication on the API (loopback-only is sufficient)
- Non-markdown files
