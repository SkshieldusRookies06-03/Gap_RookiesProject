"""FastAPI 진입점 (오너: AI). 라우트 모양은 SPEC §6 계약 — 내부 구현은 vectorstore.py · graph.py.

실행: uvicorn app.main:app --port 8000   (목은 mock_app.py)
AI는 DB에 붙지 않고 백엔드를 되부르지 않는다. ownerUuid는 백엔드가 넣어 준 값만 쓴다.
"""
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response, StreamingResponse

from . import graph, vectorstore
from .http import envelope, require_internal_token, sse
from .schemas import AnalyzeRequest, IngestRequest

app = FastAPI(title="jobgap-ai")


@app.exception_handler(HTTPException)
async def _http_error(_: Request, e: HTTPException):
    return JSONResponse(status_code=e.status_code, content=envelope(e.status_code, str(e.detail), str(e.detail)))


@app.exception_handler(RequestValidationError)
async def _invalid(_: Request, e: RequestValidationError):
    return JSONResponse(status_code=400, content=envelope(400, "VALIDATION_ERROR", "요청 형식을 확인하세요"))


@app.get("/health")
async def health():  # 내부 토큰 예외 — HEALTHCHECK가 부른다
    return {"status": "UP"}


@app.post("/internal/ingest", status_code=201, dependencies=[Depends(require_internal_token)])
def ingest(req: IngestRequest):
    chunks = vectorstore.ingest_document(req.documentId, req.ownerUuid, req.docType, req.title, req.text)
    return {"documentId": req.documentId, "chunks": chunks}


@app.delete("/internal/documents/{document_id}", status_code=204, dependencies=[Depends(require_internal_token)])
def delete_document(document_id: str, ownerUuid: str):
    vectorstore.delete_document(document_id, ownerUuid)
    return Response(status_code=204)


@app.post("/internal/analyze/stream", dependencies=[Depends(require_internal_token)])
async def analyze(req: AnalyzeRequest):
    async def events():
        try:
            async for chunk in graph.stream_events(req):
                yield chunk
        except Exception:  # 스트림이 열린 뒤의 장애는 상태코드가 아니라 event: error (SPEC §1 AI 호출 행)
            yield sse("error", envelope(503, "AI_UNAVAILABLE", "분석 중 오류가 발생했습니다"))

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
