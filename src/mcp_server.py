from __future__ import annotations
import os
from typing import Any

from mcp.server.fastmcp import FastMCP

from .config import DOCS_ROOT, INDEX_NAME
from .embedder import Embedder
from .es_client import (
    get_client,
    create_index,
    bm25_search as _bm25,
    fuzzy_search as _fuzzy,
    knn_search as _knn,
    list_docs as _list_docs,
)
from .indexer import reindex_new

_HTTP_PORT = int(os.environ.get("MCP_HTTP_PORT", "8001"))
mcp = FastMCP("ask doc", host="0.0.0.0", port=_HTTP_PORT)

_es = get_client()
_embedder = Embedder()


def _opt_list(value: Any) -> list[str] | None:
    if value is None:
        return None
    if isinstance(value, str):
        return [value] if value else None
    return list(value) or None


def _attach_file_content(hits: list[dict]) -> None:
    cache: dict[str, str | None] = {}
    for hit in hits:
        rel = hit.get("path")
        if rel is None:
            hit["file_content"] = None
            continue
        if rel not in cache:
            try:
                cache[rel] = (DOCS_ROOT / rel).read_text(encoding="utf-8", errors="replace")
            except OSError:
                cache[rel] = None
        hit["file_content"] = cache[rel]


@mcp.tool()
def rag_search(
    query: str,
    tags: list[str] | None = None,
    folder: str | None = None,
    top_k: int = 5,
    include_file_content: bool = False,
) -> list[dict[str, Any]]:
    """Semantic (vector) search over the docs vault.

    Use for conceptual, paraphrased, or "what do my docs say about X" queries
    where the user's wording may not match the exact terms in the docs.
    Examples: "how do we think about brand voice", "what is our position on
    long-term investing", "explain the IC meeting workflow".

    Args:
        query: Natural-language question or topic.
        tags: Optional list of wiki-tag names (without brackets) to filter by,
            e.g. ["branding", "voice-and-tone"]. Matches docs that contain ANY
            of these tags.
        folder: Optional top-level folder name to restrict search to,
            e.g. "PeakXV-Branding" or "trm".
        top_k: How many results to return (default 5).
        include_file_content: If True, each hit includes a 'file_content' key
            with the full text of the source .md file (null if not found on disk).

    Returns:
        List of hits, each with: path, title, folder, tags, snippet, score.
        If include_file_content is True, also includes file_content.
    """
    vec = _embedder.embed(query)
    hits = _knn(_es, vec, top_k=top_k, tags=_opt_list(tags), folder=folder)
    if include_file_content:
        _attach_file_content(hits)
    return hits


@mcp.tool()
def keyword_search(
    query: str,
    tags: list[str] | None = None,
    folder: str | None = None,
    top_k: int = 5,
    include_file_content: bool = False,
) -> list[dict[str, Any]]:
    """Exact / BM25 keyword search over the docs vault.

    Use when the user mentions a specific term, identifier, proper noun, or
    phrase that should appear verbatim in the docs. Better than RAG for code
    symbols, file names, ticket IDs, branded product names, etc.
    Examples: "find mcp-config-locations", "search for typeorm", "PeakXV Test".

    Args:
        query: The keyword or phrase to match.
        tags: Optional list of wiki-tag names (without brackets) to filter by.
        folder: Optional top-level folder to restrict the search to.
        top_k: How many results to return (default 5).
        include_file_content: If True, each hit includes a 'file_content' key
            with the full text of the source .md file (null if not found on disk).

    Returns:
        List of hits, each with: path, title, folder, tags, snippet, score.
        If include_file_content is True, also includes file_content.
    """
    hits = _bm25(_es, query, top_k=top_k, tags=_opt_list(tags), folder=folder)
    if include_file_content:
        _attach_file_content(hits)
    return hits


@mcp.tool()
def fuzzy_search(
    query: str,
    tags: list[str] | None = None,
    folder: str | None = None,
    top_k: int = 5,
    include_file_content: bool = False,
) -> list[dict[str, Any]]:
    """Fuzzy / typo-tolerant search over the docs vault.

    Use when the user may have misspelled, mistyped, or misremembered a term,
    or when keyword_search returns nothing useful. Tolerates small edit
    distances (1-2 character differences per word).
    Examples: "brandng" (typo for branding), "anti pattrn", "amplitood".

    Args:
        query: The (possibly misspelled) term or phrase.
        tags: Optional list of wiki-tag names (without brackets) to filter by.
        folder: Optional top-level folder to restrict the search to.
        top_k: How many results to return (default 5).
        include_file_content: If True, each hit includes a 'file_content' key
            with the full text of the source .md file (null if not found on disk).

    Returns:
        List of hits, each with: path, title, folder, tags, snippet, score.
        If include_file_content is True, also includes file_content.
    """
    hits = _fuzzy(_es, query, top_k=top_k, tags=_opt_list(tags), folder=folder)
    if include_file_content:
        _attach_file_content(hits)
    return hits


@mcp.tool()
def list_docs() -> list[dict[str, Any]]:
    """List all available documentation files that have been indexed and can be searched.

    Returns one entry per unique file path, with the document title (derived
    from the first H1 heading or the filename) and a chunk count. Use this to
    discover what docs exist before deciding which one to search or retrieve.

    Returns:
        List of dicts, each with: file (bare filename), path (relative path),
        chunks (number of indexed chunks), title (document title or null if
        not yet indexed).
    """
    return _list_docs(_es)


@mcp.tool()
def get_doc(path: str) -> dict[str, Any]:
    """Retrieve the full content of a specific markdown document by its path.

    Use this after a search to read the complete source file — not just the
    matched chunk, but the entire original .md document. Pass the 'path' field
    from any search result directly to this tool.
    Examples: "trm/onboarding.md", "PeakXV-Branding/voice.md".

    Args:
        path: Relative path to the document, exactly as returned in the 'path'
            field of rag_search, keyword_search, or fuzzy_search results.

    Returns:
        Dict with: path (echoed back), found (bool), content (full file text
        or null if the file no longer exists on disk).
    """
    try:
        content = (DOCS_ROOT / path).read_text(encoding="utf-8", errors="replace")
        return {"path": path, "found": True, "content": content}
    except OSError:
        return {"path": path, "found": False, "content": None}


@mcp.tool()
def wipe_index() -> dict[str, Any]:
    """Delete and recreate the vector index, removing all indexed documents.

    Use this to reset the index when you want to start fresh — for example,
    after schema changes, after removing many stale docs, or if the index has
    become corrupted. All data is permanently removed; call index_docs
    afterwards to re-populate.

    Returns:
        A dict with 'wiped' (True) and 'index' (the index name).
    """
    if _es.indices.exists(index=INDEX_NAME):
        _es.indices.delete(index=INDEX_NAME)
    create_index(_es)
    return {"wiped": True, "index": INDEX_NAME}


@mcp.tool()
def index_docs() -> dict[str, Any]:
    """Incrementally index new documents from the docs vault into the vector store.

    Scans the docs root for markdown files not yet indexed and adds them.
    Already-indexed documents are skipped (incremental, not full re-index).
    Call wipe_index first if you need a full re-index from scratch.

    Returns:
        A dict with: scanned (total .md files found), new (docs chunked and
        added), chunks_added, skipped (docs without indexable chunks),
        indexed_at (ISO timestamp).
    """
    create_index(_es)
    return reindex_new(_es, _embedder)


def main() -> None:
    transport = os.environ.get("MCP_TRANSPORT", "stdio").lower()
    if transport in ("http", "streamable-http"):
        mcp.run(transport="streamable-http")
    elif transport == "sse":
        mcp.run(transport="sse")
    else:
        mcp.run()


if __name__ == "__main__":
    main()
