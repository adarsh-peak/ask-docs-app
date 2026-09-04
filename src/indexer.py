from __future__ import annotations
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import DOCS_ROOT, EXCLUDE_DIRS
from .chunker import chunk_file
from .embedder import Embedder
from .es_client import bulk_index, indexed_file_hashes, delete_by_path


def discover_markdown(root: Path) -> list[tuple[str, Path]]:
    found: list[tuple[str, Path]] = []
    for p in root.rglob("*.md"):
        if any(part in EXCLUDE_DIRS for part in p.relative_to(root).parts):
            continue
        rel = p.relative_to(root).as_posix()
        found.append((rel, p))
    return sorted(found)


def reindex_file(es, embedder: Embedder, rel: str) -> dict[str, Any]:
    """Re-chunk and re-embed a single file, replacing any chunks already indexed for it."""
    abs_p = DOCS_ROOT / rel
    delete_by_path(es, rel)
    now = datetime.now(timezone.utc).isoformat()
    if not abs_p.exists():
        return {"path": rel, "chunks": 0, "indexed_at": now}

    file_hash = hashlib.md5(abs_p.read_bytes()).hexdigest()
    chunk_docs: list[dict[str, Any]] = []
    embed_errors: list[dict[str, str]] = []
    for chunk in chunk_file(rel, abs_p):
        try:
            vec = embedder.embed(chunk.body)
        except Exception as e:
            embed_errors.append({"chunk_id": chunk.chunk_id, "error": str(e)})
            continue
        chunk_docs.append(
            {
                "chunk_id": chunk.chunk_id,
                "path": chunk.path,
                "folder": chunk.folder,
                "title": chunk.title,
                "body": chunk.body,
                "tags": chunk.tags,
                "file_hash": file_hash,
                "embedding": vec,
                "indexed_at": now,
            }
        )

    added = bulk_index(es, chunk_docs) if chunk_docs else 0
    return {"path": rel, "chunks": added, "embed_errors": embed_errors, "indexed_at": now}


def smart_reindex(es, embedder: Embedder) -> dict[str, Any]:
    existing_hashes = indexed_file_hashes(es)
    all_files = discover_markdown(DOCS_ROOT)

    now = datetime.now(timezone.utc).isoformat()
    new_count = 0
    updated_count = 0
    skipped_count = 0
    chunks_added = 0
    embed_errors: list[dict[str, str]] = []
    chunk_docs: list[dict[str, Any]] = []

    def flush() -> None:
        nonlocal chunks_added
        if chunk_docs:
            chunks_added += bulk_index(es, chunk_docs)
            chunk_docs.clear()

    current_paths = {rel for rel, _ in all_files}
    deleted_count = 0
    for rel in existing_hashes:
        if rel not in current_paths:
            delete_by_path(es, rel)
            deleted_count += 1

    for rel, abs_p in all_files:
        try:
            file_hash = hashlib.md5(abs_p.read_bytes()).hexdigest()
        except OSError:
            skipped_count += 1
            continue

        if rel in existing_hashes:
            if existing_hashes[rel] == file_hash:
                skipped_count += 1
                continue
            delete_by_path(es, rel)
            updated_count += 1
        else:
            new_count += 1

        for chunk in chunk_file(rel, abs_p):
            try:
                vec = embedder.embed(chunk.body)
            except Exception as e:
                embed_errors.append({"chunk_id": chunk.chunk_id, "error": str(e)})
                continue
            chunk_docs.append(
                {
                    "chunk_id": chunk.chunk_id,
                    "path": chunk.path,
                    "folder": chunk.folder,
                    "title": chunk.title,
                    "body": chunk.body,
                    "tags": chunk.tags,
                    "file_hash": file_hash,
                    "embedding": vec,
                    "indexed_at": now,
                }
            )
        if len(chunk_docs) >= 50:
            flush()

    flush()

    return {
        "scanned": len(all_files),
        "new": new_count,
        "updated": updated_count,
        "deleted": deleted_count,
        "skipped": skipped_count,
        "chunks_added": chunks_added,
        "embed_errors": embed_errors,
        "indexed_at": now,
    }
