from __future__ import annotations
import re
from dataclasses import dataclass
from pathlib import Path

from .config import CHUNK_MAX_CHARS

TAG_RE = re.compile(r"(?<!\!)\[\[([^\]|#]+?)\]\]")
EMBED_RE = re.compile(r"!\[\[[^\]]+?\]\]")
H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)
HEADING_SPLIT_RE = re.compile(r"(?m)^(?=#{1,3}\s)")
FILE_EXT_RE = re.compile(r"\.(png|jpe?g|gif|webp|svg|pdf|mp4|mov|webm|mp3|wav|zip)$", re.IGNORECASE)


@dataclass
class Chunk:
    chunk_id: str
    path: str
    folder: str
    title: str
    body: str
    tags: list[str]


def extract_tags(text: str) -> list[str]:
    seen: dict[str, None] = {}
    for m in TAG_RE.finditer(text):
        raw = m.group(1).strip()
        if not raw or FILE_EXT_RE.search(raw):
            continue
        seen.setdefault(raw, None)
    return list(seen.keys())


def strip_embeds(text: str) -> str:
    return EMBED_RE.sub("", text)


def derive_title(text: str, fallback: str) -> str:
    m = H1_RE.search(text)
    return m.group(1).strip() if m else fallback


def _split_sections(text: str) -> list[str]:
    parts = [p.strip() for p in HEADING_SPLIT_RE.split(text) if p.strip()]
    return parts or [text.strip()]


def _hard_split(text: str, limit: int) -> list[str]:
    """Last-resort split for a single paragraph/line with no blank-line
    breaks, so no chunk can exceed the embedding model's context length."""
    lines = text.split("\n")
    out: list[str] = []
    buf = ""
    for line in lines:
        candidate = (buf + "\n" + line) if buf else line
        if len(candidate) > limit and buf:
            out.append(buf)
            buf = line
        else:
            buf = candidate
        while len(buf) > limit:
            out.append(buf[:limit])
            buf = buf[limit:]
    if buf:
        out.append(buf)
    return out


def _split_long(section: str, limit: int) -> list[str]:
    if len(section) <= limit:
        return [section]
    paragraphs = re.split(r"\n\s*\n", section)
    out: list[str] = []
    buf = ""
    for p in paragraphs:
        candidate = (buf + "\n\n" + p).strip() if buf else p
        if len(candidate) > limit and buf:
            out.append(buf)
            buf = p
        else:
            buf = candidate
    if buf:
        out.append(buf)
    return [piece for chunk in out for piece in (_hard_split(chunk, limit) if len(chunk) > limit else [chunk])]


def chunk_file(rel_path: str, abs_path: Path) -> list[Chunk]:
    raw_text = abs_path.read_text(encoding="utf-8", errors="replace")
    tags = extract_tags(raw_text)
    title = derive_title(raw_text, abs_path.stem)
    folder = rel_path.split("/", 1)[0] if "/" in rel_path else ""

    text = strip_embeds(raw_text)
    pieces: list[str] = []
    for section in _split_sections(text):
        pieces.extend(_split_long(section, CHUNK_MAX_CHARS))
    pieces = [p for p in pieces if p.strip()]

    chunks: list[Chunk] = []
    for i, body in enumerate(pieces):
        chunks.append(
            Chunk(
                chunk_id=f"{rel_path}#{i}",
                path=rel_path,
                folder=folder,
                title=title,
                body=body,
                tags=tags,
            )
        )
    return chunks
