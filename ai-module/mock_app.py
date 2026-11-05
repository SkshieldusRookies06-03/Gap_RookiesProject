"""ai-module/mock_app.py — 둘째 seam(백엔드 → AI) 목 · SPEC.md §6 계약 그대로.

실행:  cd ai-module && pip install fastapi==0.115.* uvicorn==0.32.* && AI_INTERNAL_TOKEN=dev-token uvicorn mock_app:app --port 8000
실물(app.py)은 같은 경로·같은 이벤트로 바뀐다. 계약이 바뀌면 이 파일도 같은 PR에서 고친다(SPEC §9).
"""
import asyncio
import json
import os
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse

TOKEN = os.environ.get("AI_INTERNAL_TOKEN", "dev-token")
app = FastAPI(title="jobgap-ai-mock")
STORE: dict[str, dict] = {}  # document_id -> {"owner": uuid, "chunks": n, "title": str}


def envelope(status: int, code: str, message: str) -> dict:
    ts = datetime.now(timezone(timedelta(hours=9))).isoformat(timespec="seconds")
    return {"success": False, "data": None, "statusCode": status, "code": code, "message": message, "timestamp": ts}


@app.exception_handler(HTTPException)
async def http_error(_: Request, e: HTTPException):
    return JSONResponse(status_code=e.status_code, content=envelope(e.status_code, e.detail, e.detail))


def guard(token: str | None):
    if token != TOKEN:
        raise HTTPException(status_code=401, detail="UNAUTHORIZED")


@app.get("/health")
async def health():  # 내부 토큰 예외
    return {"status": "UP"}


@app.post("/internal/ingest", status_code=201)
async def ingest(req: Request, x_internal_token: str | None = Header(default=None, alias="X-Internal-Token")):
    guard(x_internal_token)
    b = await req.json()
    for k in ("documentId", "ownerUuid", "docType", "title", "text"):
        if not b.get(k):
            raise HTTPException(status_code=400, detail="VALIDATION_ERROR")
    chunks = max(1, len(b["text"]) // 500 + 1)  # 같은 documentId면 덮어쓴다(멱등)
    STORE[b["documentId"]] = {"owner": b["ownerUuid"], "chunks": chunks, "title": b["title"], "type": b["docType"]}
    return {"documentId": b["documentId"], "chunks": chunks}


@app.delete("/internal/documents/{document_id}", status_code=204)
async def delete_document(document_id: str, ownerUuid: str, x_internal_token: str | None = Header(default=None, alias="X-Internal-Token")):
    guard(x_internal_token)
    doc = STORE.get(document_id)
    if doc and doc["owner"] == ownerUuid:
        del STORE[document_id]
    return Response(status_code=204)  # 없어도 204 (멱등)


def sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/internal/analyze/stream")
async def analyze(req: Request, fail: int = 0, x_internal_token: str | None = Header(default=None, alias="X-Internal-Token")):
    guard(x_internal_token)
    b = await req.json()

    async def gen():
        if fail:
            yield sse("error", envelope(503, "AI_UNAVAILABLE", "LLM 호출 실패(목)"))
            return
        # 토큰 다섯 개 — 그중 둘은 줄바꿈 포함(JSON 문자열 인코딩 확인용)
        for tok in ["## 요구 기술\n", "| 기술 | 보유 |\n|---|---|\n", "| Spring Boot | 보유 |", "\n| Kubernetes | 없음 |", " 끝"]:
            yield sse("token", tok)
            await asyncio.sleep(0.1)
        sources = [
            {"type": "doc", "documentId": d, "docType": STORE[d]["type"], "chunk": "(목 청크)", "score": 0.81}
            for d in (b.get("postingId"), b.get("resumeId"))
            if d in STORE and STORE[d]["owner"] == b.get("ownerUuid")  # owner 필터 — 남의 문서·삭제된 문서는 안 나온다
        ]
        sources.append({"type": "web", "url": "https://example.com/news", "title": "기업 기술 블로그(목)"})
        yield sse("sources", sources)
        yield sse("done", {})

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
