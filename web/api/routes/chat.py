"""POST /api/chat — SSE streaming chatbot backed by Claude claude-sonnet-4-6 with tool use."""
from __future__ import annotations

import json
import os
from typing import AsyncGenerator, Optional

import anthropic
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from web.api.chat_prompts import SYSTEM_PROMPT
from web.api.chat_tools import TOOL_SCHEMAS, execute_tool

router = APIRouter()

_MODEL = "claude-sonnet-4-6"
_MAX_TOKENS = 2048
_MAX_TURNS = 20  # cap total user+assistant turns per session


class PageContext(BaseModel):
    path: str
    sku: Optional[str] = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    page_context: Optional[PageContext] = None


def _sse(event_type: str, data: dict) -> str:
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"


def _inject_context(messages: list[dict], ctx: Optional[PageContext]) -> list[dict]:
    """Prepend page context to the first user message for situational awareness."""
    if not ctx or not messages:
        return messages
    parts = [f"path={ctx.path}"]
    if ctx.sku:
        parts.append(f"sku={ctx.sku}")
    prefix = f"[Page context: {', '.join(parts)}]\n\n"
    out = list(messages)
    first = out[0]
    if first["role"] == "user":
        out[0] = {"role": "user", "content": prefix + str(first["content"])}
    return out


def _serialize_content(content: list) -> list[dict]:
    """Convert Anthropic content blocks to plain dicts for re-submission."""
    result = []
    for block in content:
        if block.type == "text":
            result.append({"type": "text", "text": block.text})
        elif block.type == "tool_use":
            result.append({"type": "tool_use", "id": block.id,
                           "name": block.name, "input": block.input})
    return result


async def _stream_chat(
    messages: list[dict],
    page_context: Optional[PageContext],
) -> AsyncGenerator[str, None]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        yield _sse("error", {"message": "ANTHROPIC_API_KEY not configured"})
        return

    client = anthropic.AsyncAnthropic(api_key=api_key)
    working = _inject_context(messages, page_context)

    turns = 0
    while turns < _MAX_TURNS:
        turns += 1
        try:
            async with client.messages.stream(
                model=_MODEL,
                system=SYSTEM_PROMPT,  # type: ignore[arg-type]
                messages=working,
                tools=TOOL_SCHEMAS,  # type: ignore[arg-type]
                max_tokens=_MAX_TOKENS,
            ) as stream:
                async for text in stream.text_stream:
                    yield _sse("token", {"content": text})
                message = await stream.get_final_message()

        except anthropic.APIStatusError as exc:
            yield _sse("error", {"message": f"API error {exc.status_code}: {exc.message}"})
            return
        except Exception as exc:  # noqa: BLE001
            yield _sse("error", {"message": str(exc)})
            return

        if message.stop_reason != "tool_use":
            yield _sse("done", {})
            return

        # Execute tool calls and continue the loop
        tool_uses = [b for b in message.content if b.type == "tool_use"]
        working.append({"role": "assistant", "content": _serialize_content(message.content)})

        tool_results = []
        for tu in tool_uses:
            yield _sse("tool_start", {"name": tu.name})
            try:
                result = execute_tool(tu.name, tu.input)
            except Exception as exc:  # noqa: BLE001
                result = {"error": str(exc)}
            yield _sse("tool_end", {"name": tu.name})
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tu.id,
                "content": json.dumps(result, default=str),
            })

        working.append({"role": "user", "content": tool_results})

    yield _sse("error", {"message": "Session exceeded maximum turn limit"})


@router.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    if not request.messages:
        raise HTTPException(status_code=422, detail="messages must not be empty")

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    return StreamingResponse(
        _stream_chat(messages, request.page_context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
