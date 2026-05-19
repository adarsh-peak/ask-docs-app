from __future__ import annotations
import asyncio
import json
import os
from contextlib import AsyncExitStack, asynccontextmanager
from pathlib import Path
from typing import Any, AsyncIterator

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

MCP_URL = os.environ.get("MCP_URL", "http://127.0.0.1:8001/mcp/")
APP_URL = os.environ.get("APP_URL", "http://app:8000")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
MAX_TURNS = int(os.environ.get("MAX_TOOL_TURNS", "6"))
STATIC_DIR = Path(__file__).parent / "static"

SYSTEM_PROMPT = (
    "You are an assistant for the user's personal docs vault.\n"
    "\n"
    "On every user turn, your FIRST action MUST be to call one of the search tools:\n"
    "  - rag_search  for paraphrased / conceptual questions\n"
    "  - keyword_search for exact terms, proper nouns, identifiers\n"
    "  - fuzzy_search for likely-typo'd or misremembered words\n"
    "Do not answer from memory and do not refuse — always search first, then answer\n"
    "based on what the tools return. If the results are empty, say so plainly and\n"
    "suggest a different phrasing; do not invent content.\n"
    "\n"
    "Always cite the `path` of each doc you reference."
)


class MCPBridge:
    def __init__(self, url: str):
        self.url = url
        self.session: ClientSession | None = None
        self.tools: list[dict[str, Any]] = []
        self._stack: AsyncExitStack | None = None

    async def start(self, retries: int = 30, delay: float = 2.0) -> None:
        last_err: Exception | None = None
        for attempt in range(retries):
            try:
                stack = AsyncExitStack()
                read, write, _ = await stack.enter_async_context(
                    streamablehttp_client(self.url)
                )
                session = await stack.enter_async_context(ClientSession(read, write))
                await session.initialize()
                self._stack = stack
                self.session = session
                await self.refresh_tools()
                print(f"[agent] connected to MCP at {self.url}, tools={len(self.tools)}")
                return
            except Exception as e:
                last_err = e
                print(f"[agent] MCP connect attempt {attempt + 1}/{retries} failed: {e}")
                await asyncio.sleep(delay)
        raise RuntimeError(f"could not connect to MCP at {self.url}: {last_err}")

    async def stop(self) -> None:
        if self._stack:
            try:
                await self._stack.aclose()
            except Exception as e:
                print(f"[agent] error closing MCP stack: {e}")

    async def refresh_tools(self) -> None:
        assert self.session is not None
        result = await self.session.list_tools()
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description or "",
                    "parameters": t.inputSchema or {"type": "object", "properties": {}},
                },
            }
            for t in result.tools
        ]

    async def call_tool(self, name: str, args: dict[str, Any]) -> Any:
        assert self.session is not None
        result = await self.session.call_tool(name, args or {})
        out: list[Any] = []
        for c in result.content:
            text = getattr(c, "text", None)
            if text is None:
                out.append(str(c))
                continue
            try:
                out.append(json.loads(text))
            except Exception:
                out.append(text)
        if len(out) == 1:
            return out[0]
        return out


bridge = MCPBridge(MCP_URL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await bridge.start()
    yield
    await bridge.stop()


app = FastAPI(title="docs-rag agent", lifespan=lifespan, docs_url="/swagger")
app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="vite-assets")


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/healthz")
async def healthz():
    return {
        "agent": "ok",
        "mcp": "ok" if bridge.session else "down",
        "tools_loaded": len(bridge.tools),
        "model": GEMINI_MODEL,
    }


@app.post("/admin/wipe")
async def admin_wipe():
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(f"{APP_URL}/admin/wipe")
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))


@app.get("/docs")
async def list_docs():
    """Proxy to daemon: list all indexed files with chunk counts and titles."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"{APP_URL}/docs")
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))


@app.get("/docs/content")
async def get_doc_content(path: str):
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"{APP_URL}/docs/content", params={"path": path})
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))


@app.get("/stats")
async def stats():
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"{APP_URL}/stats")
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))


@app.post("/admin/reindex")
async def admin_reindex():
    async with httpx.AsyncClient(timeout=600.0) as client:
        try:
            resp = await client.post(f"{APP_URL}/reindex")
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1)
    api_key: str = Field(..., min_length=1)
    history: list[dict[str, Any]] = Field(default_factory=list)


def _sse(event: str, data: Any) -> str:
    payload = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


def _gemini_tools() -> list[dict[str, Any]]:
    return [
        {
            "name": t["function"]["name"],
            "description": t["function"]["description"],
            "parameters": t["function"]["parameters"],
        }
        for t in bridge.tools
    ]


def _build_gemini_contents(
    history: list[dict[str, Any]], query: str
) -> list[dict[str, Any]]:
    contents: list[dict[str, Any]] = []
    for msg in history:
        role = "model" if msg.get("role") == "assistant" else msg.get("role", "user")
        contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})
    contents.append({"role": "user", "parts": [{"text": query}]})
    return contents


def _slim_for_model(result: Any) -> Any:
    """Keep only path, title, snippet — drop score/tags/folder."""
    def slim_one(h: dict[str, Any]) -> dict[str, Any]:
        snippet = h.get("snippet") or ""
        if len(snippet) > 1200:
            snippet = snippet[:1200] + "..."
        return {"path": h.get("path"), "title": h.get("title"), "snippet": snippet}

    if isinstance(result, list):
        return [slim_one(h) if isinstance(h, dict) else h for h in result]
    return result


async def _chat_stream(req: ChatRequest) -> AsyncIterator[str]:
    contents = _build_gemini_contents(req.history, req.query)

    async with httpx.AsyncClient(timeout=None) as client:
        for turn in range(MAX_TURNS):
            collected_text = ""
            function_calls: list[dict[str, Any]] = []

            payload = {
                "contents": contents,
                "tools": [{"functionDeclarations": _gemini_tools()}],
                "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            }

            try:
                async with client.stream(
                    "POST",
                    f"{GEMINI_API_BASE}/{GEMINI_MODEL}:streamGenerateContent",
                    params={"key": req.api_key, "alt": "sse"},
                    json=payload,
                ) as resp:
                    if resp.status_code >= 400:
                        body = await resp.aread()
                        yield _sse(
                            "error",
                            {"detail": f"Gemini HTTP {resp.status_code}: {body.decode()[:500]}"},
                        )
                        return
                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        raw = line[6:].strip()
                        if not raw or raw == "[DONE]":
                            continue
                        try:
                            chunk = json.loads(raw)
                        except Exception:
                            continue
                        for candidate in chunk.get("candidates", []):
                            for part in candidate.get("content", {}).get("parts", []):
                                if part.get("text"):
                                    collected_text += part["text"]
                                    yield _sse("token", part["text"])
                                if "functionCall" in part:
                                    function_calls.append(part["functionCall"])
            except Exception as e:
                yield _sse("error", {"detail": f"Gemini stream failed: {e}"})
                return

            if not function_calls:
                if collected_text.strip():
                    yield _sse("done", {"answer": collected_text})
                else:
                    yield _sse("done", {
                        "answer": (
                            "No response received. Try rephrasing, or ask something "
                            "tied to your docs — e.g. \"what does my branding doc say "
                            "about voice and tone\"."
                        ),
                        "fallback": True,
                    })
                return

            # Append model turn
            model_parts: list[dict[str, Any]] = []
            if collected_text:
                model_parts.append({"text": collected_text})
            for fc in function_calls:
                model_parts.append({"functionCall": fc})
            contents.append({"role": "model", "parts": model_parts})

            # Execute tool calls and collect responses
            tool_response_parts: list[dict[str, Any]] = []
            for fc in function_calls:
                name = fc.get("name", "")
                args = fc.get("args", {})
                yield _sse("tool_call", {"name": name, "args": args})
                try:
                    result = await bridge.call_tool(name, args or {})
                except Exception as e:
                    result = {"error": str(e)}
                yield _sse("tool_result", {"name": name, "result": result})
                slim = _slim_for_model(result)
                response_obj = slim if isinstance(slim, dict) else {"results": slim}
                tool_response_parts.append({
                    "functionResponse": {"name": name, "response": response_obj}
                })

            contents.append({"role": "user", "parts": tool_response_parts})

    yield _sse("done", {"answer": "(max tool turns reached without a final answer)"})


@app.post("/chat")
async def chat(req: ChatRequest):
    return StreamingResponse(
        _chat_stream(req),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    """Serve index.html for client-side routes (/files, /graph) so deep links
    and reloads don't 404. Declared last so real API routes take precedence."""
    return FileResponse(STATIC_DIR / "index.html")
