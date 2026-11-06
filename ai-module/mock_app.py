"""ai-module/mock_app.py — 둘째 seam(백엔드 → AI) 목 · SPEC.md §6 계약 그대로.

실행:  cd ai-module && pip install fastapi==0.115.* uvicorn==0.32.* && AI_INTERNAL_TOKEN=dev-token uvicorn mock_app:app --port 8000
실물(app/main.py)은 같은 경로·같은 이벤트로 바뀐다. 계약이 바뀌면 이 파일도 같은 PR에서 고친다(SPEC §9).
"""
import asyncio
import hmac
import json
import os
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas import AnalyzeRequest, IngestRequest  # 실물과 같은 스키마 — null·타입·Literal 위반을 목에서도 400으로

TOKEN = os.environ.get("AI_INTERNAL_TOKEN", "dev-token")
app = FastAPI(title="jobgap-ai-mock")
STORE: dict[str, dict] = {}  # document_id -> {"owner": uuid, "chunks": n, "title": str}


def envelope(status: int, code: str, message: str) -> dict:
    ts = datetime.now(timezone(timedelta(hours=9))).isoformat(timespec="seconds")
    return {"success": False, "data": None, "statusCode": status, "code": code, "message": message, "timestamp": ts}


@app.exception_handler(StarletteHTTPException)   # 라우팅 404·405도 봉투로 (실물 app/main.py와 같게)
async def http_error(_: Request, e: StarletteHTTPException):
    detail = str(e.detail)
    code = detail if detail.isupper() else {404: "NOT_FOUND", 405: "NOT_FOUND"}.get(e.status_code, "INTERNAL_SERVER_ERROR")
    return JSONResponse(status_code=e.status_code, content=envelope(e.status_code, code, code))


@app.exception_handler(RequestValidationError)   # ownerUuid 빠진 DELETE 등 — FastAPI 422 원형 대신 실물과 같은 400 봉투
async def invalid(_: Request, e: RequestValidationError):
    return JSONResponse(status_code=400, content=envelope(400, "VALIDATION_ERROR", "요청 형식을 확인하세요"))


def guard(token: str | None):
    if not token or not hmac.compare_digest(token.encode(), TOKEN.encode()):
        raise HTTPException(status_code=401, detail="UNAUTHORIZED")


async def body_of(req: Request) -> dict:
    """깨진 JSON은 평문 500이 아니라 400 봉투"""
    try:
        b = await req.json()
    except ValueError:
        raise HTTPException(status_code=400, detail="VALIDATION_ERROR")
    if not isinstance(b, dict):
        raise HTTPException(status_code=400, detail="VALIDATION_ERROR")
    return b


@app.get("/health")
async def health():  # 내부 토큰 예외
    return {"status": "UP"}


@app.post("/internal/ingest", status_code=201)
async def ingest(req: Request, x_internal_token: str | None = Header(default=None, alias="X-Internal-Token")):
    guard(x_internal_token)
    b = await body_of(req)
    try:
        IngestRequest.model_validate(b)
    except ValidationError:
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
    b = await body_of(req)
    try:  # "question": null · "history": null 처럼 BE가 null을 보내면 실물도 400이다 — 목이 통과시키면 compose에서야 드러난다
        AnalyzeRequest.model_validate(b)
    except ValidationError:
        raise HTTPException(status_code=400, detail="VALIDATION_ERROR")

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
