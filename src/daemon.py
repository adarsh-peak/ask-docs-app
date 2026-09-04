from __future__ import annotations
from collections import Counter
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from .config import INDEX_NAME, DOCS_ROOT, LIST_EXCLUDE_DIRS, SUPPORTED_EXTENSIONS
from .es_client import (
    get_client,
    create_index,
    knn_search,
    bm25_search,
    fuzzy_search,
    list_docs,
    delete_by_path,
)
from .embedder import Embedder
from .indexer import smart_reindex, reindex_file


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    tags: list[str] | None = None
    folder: str | None = None
    top_k: int = Field(5, ge=1, le=50)


class SaveDocRequest(BaseModel):
    path: str = Field(..., min_length=1)
    content: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.es = get_client()
    app.state.embedder = Embedder()
    try:
        create_index(app.state.es)
    except Exception as e:
        print(f"[daemon] warning: create_index failed (ES may not be up yet): {e}")
    yield
    app.state.embedder.close()
    app.state.es.close()


app = FastAPI(title="docs-rag daemon", lifespan=lifespan, docs_url="/swagger")


@app.get("/health")
def health():
    es = app.state.es
    embedder: Embedder = app.state.embedder
    try:
        cluster = es.cluster.health()
        es_status = cluster.get("status", "unknown")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"elasticsearch unreachable: {e}")
    if not embedder.ping():
        raise HTTPException(status_code=503, detail="ollama unreachable")
    return {"es": es_status, "ollama": "ready", "index": INDEX_NAME}


@app.post("/reindex")
def reindex():
    es = app.state.es
    create_index(es)
    try:
        result = smart_reindex(es, app.state.embedder)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"reindex failed: {e}")
    return result


@app.post("/admin/wipe")
def wipe():
    es = app.state.es
    try:
        if es.indices.exists(index=INDEX_NAME):
            es.indices.delete(index=INDEX_NAME)
        create_index(es)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"wipe failed: {e}")
    return {"wiped": True, "index": INDEX_NAME}


@app.post("/search/rag")
def search_rag(req: SearchRequest) -> list[dict[str, Any]]:
    """Semantic (vector kNN) search. Best for paraphrased or conceptual queries."""
    vec = app.state.embedder.embed(req.query)
    return knn_search(app.state.es, vec, top_k=req.top_k, tags=req.tags, folder=req.folder)


@app.post("/search/keyword")
def search_keyword(req: SearchRequest) -> list[dict[str, Any]]:
    """BM25 keyword search. Best for exact terms, identifiers, proper nouns."""
    return bm25_search(app.state.es, req.query, top_k=req.top_k, tags=req.tags, folder=req.folder)


@app.post("/search/fuzzy")
def search_fuzzy(req: SearchRequest) -> list[dict[str, Any]]:
    """Typo-tolerant fuzzy search. Best when the query may be misspelled."""
    return fuzzy_search(app.state.es, req.query, top_k=req.top_k, tags=req.tags, folder=req.folder)


@app.get("/files")
def list_all_files():
    """List all supported files in DOCS_ROOT recursively, with last-modified time."""
    root = DOCS_ROOT.resolve()
    files = []
    for f in sorted(root.rglob("*")):
        if not f.is_file():
            continue
        if f.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        rel = f.relative_to(root)
        if any(part in LIST_EXCLUDE_DIRS for part in rel.parts[:-1]):
            continue
        try:
            mtime = f.stat().st_mtime
        except OSError:
            continue
        files.append({
            "path": str(rel),
            "updated_at": datetime.fromtimestamp(mtime).isoformat(),
        })
    return {"files": files}


@app.get("/activity")
def activity():
    """Per-day file modification counts across DOCS_ROOT, for a GitHub-style heatmap."""
    root = DOCS_ROOT.resolve()
    counts: Counter[str] = Counter()
    for f in root.rglob("*"):
        if not f.is_file():
            continue
        if f.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        rel = f.relative_to(root)
        if any(part in LIST_EXCLUDE_DIRS for part in rel.parts[:-1]):
            continue
        try:
            mtime = f.stat().st_mtime
        except OSError:
            continue
        day = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")
        counts[day] += 1
    return {"activity": [{"date": d, "count": c} for d, c in sorted(counts.items())]}


@app.get("/docs")
def docs():
    """Return all indexed files with chunk counts and titles."""
    return list_docs(app.state.es)


@app.get("/docs/content")
def get_doc_content(path: str = Query(..., min_length=1)):
    """Return raw markdown content of a doc by its relative path."""
    try:
        abs_path = (DOCS_ROOT / path).resolve()
        abs_path.relative_to(DOCS_ROOT.resolve())
    except (ValueError, Exception):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not abs_path.exists() or not abs_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        with open(abs_path, "rb") as fh:
            content = fh.read().decode("utf-8", errors="replace")
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Could not read file: {e}")
    stat = abs_path.stat()
    created_ts = getattr(stat, "st_birthtime", stat.st_ctime)
    return {
        "path": path,
        "content": content,
        "created_at": datetime.fromtimestamp(created_ts).isoformat(),
        "updated_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
    }


@app.put("/docs/content")
def save_doc_content(req: SaveDocRequest):
    """Write markdown content to disk and re-index just that file."""
    try:
        abs_path = (DOCS_ROOT / req.path).resolve()
        abs_path.relative_to(DOCS_ROOT.resolve())
    except (ValueError, Exception):
        raise HTTPException(status_code=400, detail="Invalid path")
    if abs_path.suffix.lower() != ".md":
        raise HTTPException(status_code=400, detail="Only markdown files can be edited")
    try:
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_text(req.content, encoding="utf-8")
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Could not write file: {e}")

    try:
        reindex_result = reindex_file(app.state.es, app.state.embedder, req.path)
    except Exception as e:
        reindex_result = {"error": str(e)}

    stat = abs_path.stat()
    created_ts = getattr(stat, "st_birthtime", stat.st_ctime)
    return {
        "path": req.path,
        "created_at": datetime.fromtimestamp(created_ts).isoformat(),
        "updated_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "reindex": reindex_result,
    }


@app.delete("/docs")
def delete_doc(path: str = Query(..., min_length=1)):
    """Delete a doc file from disk and remove its chunks from the index."""
    try:
        abs_path = (DOCS_ROOT / path).resolve()
        abs_path.relative_to(DOCS_ROOT.resolve())
    except (ValueError, Exception):
        raise HTTPException(status_code=400, detail="Invalid path")
    if not abs_path.exists() or not abs_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    abs_path.unlink()
    delete_by_path(app.state.es, path)
    return {"deleted": path}


@app.get("/stats")
def stats():
    es = app.state.es
    if not es.indices.exists(index=INDEX_NAME):
        return {"docs_indexed": 0, "chunks_indexed": 0}
    count = es.count(index=INDEX_NAME)["count"]
    agg = es.search(
        index=INDEX_NAME,
        body={
            "size": 0,
            "aggs": {"unique_paths": {"cardinality": {"field": "path"}}},
        },
    )
    docs = agg["aggregations"]["unique_paths"]["value"]
    return {"docs_indexed": docs, "chunks_indexed": count}
