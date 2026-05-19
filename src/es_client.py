from __future__ import annotations
from typing import Any, Iterable
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk

from .config import ES_URL, INDEX_NAME, EMBED_DIMS, SNIPPET_CHARS


def get_client() -> Elasticsearch:
    return Elasticsearch(ES_URL, request_timeout=30)


def index_mapping() -> dict[str, Any]:
    return {
        "mappings": {
            "properties": {
                "path": {"type": "keyword"},
                "chunk_id": {"type": "keyword"},
                "title": {
                    "type": "text",
                    "fields": {"raw": {"type": "keyword"}},
                },
                "body": {"type": "text"},
                "tags": {"type": "keyword"},
                "folder": {"type": "keyword"},
                "embedding": {
                    "type": "dense_vector",
                    "dims": EMBED_DIMS,
                    "index": True,
                    "similarity": "cosine",
                },
                "indexed_at": {"type": "date"},
            }
        },
        "settings": {
            "index": {
                "number_of_shards": 1,
                "number_of_replicas": 0,
            }
        },
    }


def create_index(es: Elasticsearch) -> bool:
    if es.indices.exists(index=INDEX_NAME):
        return False
    es.indices.create(index=INDEX_NAME, body=index_mapping())
    return True


def list_docs(es: Elasticsearch) -> list[dict[str, Any]]:
    if not es.indices.exists(index=INDEX_NAME):
        return []
    resp = es.search(
        index=INDEX_NAME,
        body={
            "size": 0,
            "aggs": {
                "by_path": {
                    "terms": {"field": "path", "size": 10000},
                    "aggs": {
                        "doc_title": {
                            "top_hits": {"size": 1, "_source": ["title", "tags", "folder"]}
                        }
                    },
                }
            },
        },
    )
    out: list[dict[str, Any]] = []
    for bucket in resp["aggregations"]["by_path"]["buckets"]:
        path: str = bucket["key"]
        hits = bucket["doc_title"]["hits"]["hits"]
        src = hits[0]["_source"] if hits else {}
        out.append({
            "file": path.split("/")[-1],
            "path": path,
            "chunks": bucket["doc_count"],
            "title": src.get("title"),
            "tags": src.get("tags", []),
            "folder": src.get("folder", ""),
        })
    return sorted(out, key=lambda x: x["path"])


def indexed_paths(es: Elasticsearch) -> set[str]:
    if not es.indices.exists(index=INDEX_NAME):
        return set()
    out: set[str] = set()
    resp = es.search(
        index=INDEX_NAME,
        body={
            "size": 0,
            "aggs": {"paths": {"terms": {"field": "path", "size": 10000}}},
        },
    )
    for bucket in resp["aggregations"]["paths"]["buckets"]:
        out.add(bucket["key"])
    return out


def bulk_index(es: Elasticsearch, docs: Iterable[dict[str, Any]]) -> int:
    actions = (
        {
            "_op_type": "index",
            "_index": INDEX_NAME,
            "_id": d["chunk_id"],
            "_source": d,
        }
        for d in docs
    )
    success, _ = bulk(es, actions, refresh="wait_for")
    return success


def _filter_clauses(tags: list[str] | None, folder: str | None) -> list[dict[str, Any]]:
    f: list[dict[str, Any]] = []
    if tags:
        f.append({"terms": {"tags": tags}})
    if folder:
        f.append({"term": {"folder": folder}})
    return f


def _format_hits(resp: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for h in resp["hits"]["hits"]:
        src = h["_source"]
        body = src.get("body", "")
        out.append(
            {
                "path": src.get("path"),
                "title": src.get("title"),
                "folder": src.get("folder"),
                "tags": src.get("tags", []),
                "snippet": body[:SNIPPET_CHARS],
                "score": h["_score"],
            }
        )
    return out


def knn_search(
    es: Elasticsearch,
    vector: list[float],
    top_k: int,
    tags: list[str] | None = None,
    folder: str | None = None,
) -> list[dict[str, Any]]:
    body: dict[str, Any] = {
        "knn": {
            "field": "embedding",
            "query_vector": vector,
            "k": max(top_k * 4, 20),
            "num_candidates": max(top_k * 20, 100),
        },
        "_source": ["path", "title", "folder", "tags", "body"],
        "size": top_k,
        "collapse": {"field": "path"},
    }
    f = _filter_clauses(tags, folder)
    if f:
        body["knn"]["filter"] = f
    resp = es.search(index=INDEX_NAME, body=body)
    return _format_hits(resp)


def bm25_search(
    es: Elasticsearch,
    query: str,
    top_k: int,
    tags: list[str] | None = None,
    folder: str | None = None,
) -> list[dict[str, Any]]:
    must = [
        {
            "multi_match": {
                "query": query,
                "fields": ["title^2", "body"],
                "type": "best_fields",
            }
        }
    ]
    body = {
        "query": {"bool": {"must": must, "filter": _filter_clauses(tags, folder)}},
        "_source": ["path", "title", "folder", "tags", "body"],
        "size": top_k,
        "collapse": {"field": "path"},
    }
    resp = es.search(index=INDEX_NAME, body=body)
    return _format_hits(resp)


def fuzzy_search(
    es: Elasticsearch,
    query: str,
    top_k: int,
    tags: list[str] | None = None,
    folder: str | None = None,
) -> list[dict[str, Any]]:
    must = [
        {
            "multi_match": {
                "query": query,
                "fields": ["title^2", "body"],
                "fuzziness": "AUTO",
                "prefix_length": 1,
            }
        }
    ]
    body = {
        "query": {"bool": {"must": must, "filter": _filter_clauses(tags, folder)}},
        "_source": ["path", "title", "folder", "tags", "body"],
        "size": top_k,
        "collapse": {"field": "path"},
    }
    resp = es.search(index=INDEX_NAME, body=body)
    return _format_hits(resp)
