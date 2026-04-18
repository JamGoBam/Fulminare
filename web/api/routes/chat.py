"""POST /api/chat — SSE streaming chatbot backed by local Ollama (OpenAI-compatible API)."""
from __future__ import annotations

import json
from typing import AsyncGenerator, Optional

from openai import AsyncOpenAI, APIConnectionError
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from web.api.config import OLLAMA_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT
from web.api.chat_prompts import SYSTEM_PROMPT
from web.api.chat_tools import TOOL_SCHEMAS, execute_tool
from web.api.chat_validator import validate_response

router = APIRouter()

_MAX_TOKENS = 2048
_MAX_TURNS = 20


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
    if out[0]["role"] == "user":
        out[0] = {"role": "user", "content": prefix + str(out[0]["content"])}
    return out


async def _stream_chat(
    messages: list[dict],
    page_context: Optional[PageContext],
) -> AsyncGenerator[str, None]:
    client = AsyncOpenAI(
        base_url=OLLAMA_URL,
        api_key="ollama",
        timeout=float(OLLAMA_TIMEOUT),
    )
    working: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *_inject_context(messages, page_context),
    ]

    all_tool_results: list[str] = []
    turns = 0
    while turns < _MAX_TURNS:
        turns += 1
        try:
            stream = await client.chat.completions.create(
                model=OLLAMA_MODEL,
                messages=working,
                tools=TOOL_SCHEMAS,
                max_tokens=_MAX_TOKENS,
                stream=True,
            )
        except APIConnectionError:
            yield _sse("error", {"message": "Ollama offline — run `ollama serve`"})
            return
        except Exception as exc:  # noqa: BLE001
            yield _sse("error", {"message": str(exc)})
            return

        # Accumulate streaming response
        text_buffer = ""
        tool_calls_acc: dict[int, dict] = {}
        finish_reason: str | None = None

        try:
            async for chunk in stream:
                choice = chunk.choices[0] if chunk.choices else None
                if not choice:
                    continue
                if choice.finish_reason:
                    finish_reason = choice.finish_reason
                delta = choice.delta

                if delta.content:
                    text_buffer += delta.content
                    yield _sse("token", {"content": delta.content})

                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        if idx not in tool_calls_acc:
                            tool_calls_acc[idx] = {"id": "", "name": "", "arguments": ""}
                        if tc.id:
                            tool_calls_acc[idx]["id"] = tc.id
                        if tc.function and tc.function.name:
                            tool_calls_acc[idx]["name"] = tc.function.name
                        if tc.function and tc.function.arguments:
                            tool_calls_acc[idx]["arguments"] += tc.function.arguments
        except Exception as exc:  # noqa: BLE001
            yield _sse("error", {"message": str(exc)})
            return

        if finish_reason != "tool_calls" or not tool_calls_acc:
            if not validate_response(text_buffer, all_tool_results):
                yield _sse("warning", {"message": "Some figures could not be verified against live data."})
            yield _sse("done", {})
            return

        # Build OpenAI-format assistant message with tool_calls
        tool_calls_list = [
            {
                "id": tool_calls_acc[i]["id"],
                "type": "function",
                "function": {
                    "name": tool_calls_acc[i]["name"],
                    "arguments": tool_calls_acc[i]["arguments"],
                },
            }
            for i in sorted(tool_calls_acc)
        ]
        assistant_msg: dict = {"role": "assistant", "tool_calls": tool_calls_list}
        if text_buffer:
            assistant_msg["content"] = text_buffer
        working.append(assistant_msg)

        # Execute each tool and append results as individual tool messages
        for tc_item in tool_calls_list:
            name = tc_item["function"]["name"]
            yield _sse("tool_start", {"name": name})
            try:
                args = json.loads(tc_item["function"]["arguments"] or "{}")
                result = execute_tool(name, args)
            except Exception as exc:  # noqa: BLE001
                result = {"error": str(exc)}
            yield _sse("tool_end", {"name": name})
            result_str = json.dumps(result, default=str)
            all_tool_results.append(result_str)
            working.append({
                "role": "tool",
                "tool_call_id": tc_item["id"],
                "content": result_str,
            })

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
