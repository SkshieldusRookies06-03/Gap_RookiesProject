"""내부 토큰 검사 · 에러 봉투 · SSE 한 줄 (오너: AI · 계약 부분은 기술 리드 리뷰). SPEC §6 공통."""
import hmac
import json
from datetime import datetime, timedelta, timezone

from fastapi import Header, HTTPException

from .config import settings

KST = timezone(timedelta(hours=9))


def envelope(status: int, code: str, message: str) -> dict:
    return {"success": False, "data": None, "statusCode": status, "code": code, "message": message,
            "timestamp": datetime.now(KST).isoformat(timespec="seconds")}


def require_internal_token(x_internal_token: str | None = Header(default=None, alias="X-Internal-Token")) -> None:
    """X-Internal-Token 검사 — /health 를 뺀 전 경로 (점검서 A-1 2차 방어선)"""
    expected = settings().internal_token
    # 상수 시간 비교 — 응답 시간 차로 토큰을 한 글자씩 맞히지 못하게
    if not expected or not x_internal_token or not hmac.compare_digest(x_internal_token.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="UNAUTHORIZED")


def sse(event: str, data) -> str:
    """token data는 JSON 문자열로 — 줄바꿈 든 조각이 프레임을 깨지 않게(SPEC §4.3)"""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
