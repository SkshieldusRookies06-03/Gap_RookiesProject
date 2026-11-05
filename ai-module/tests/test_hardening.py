"""[기술 리드] AI 내부 API 회귀 — 봉투·토큰·요청 검증 (SPEC §1 "AI 내부 에러도 같은 봉투" · §4.3 · §6 · 점검서 A-1 · B-8).

판정 테스트(test_contract·test_failure)는 그대로 두고, 리뷰에서 찾은 결함만 고정한다. 키 없이 돈다(conftest: LLM_PROVIDER=fake).
실물(app.main)과 목(mock_app)이 같은 규칙을 지키는지 함께 본다 — 목이 더 느슨하면 BE가 목에선 green, compose에선 red가 된다.
"""
import pytest
from fastapi.testclient import TestClient

from conftest import TOKEN

ENVELOPE_KEYS = {"success", "data", "statusCode", "code", "message", "timestamp"}

VALID_ANALYZE = {"ownerUuid": "u-1", "postingId": "12", "resumeId": "15", "postingTitle": "공고",
                 "mode": "REPORT", "question": "", "history": []}
VALID_INGEST = {"documentId": "12", "ownerUuid": "u-1", "docType": "JOB_POSTING", "title": "t", "text": "자격요건: Java"}


@pytest.fixture(scope="module")
def real():
    from app.main import app
    return TestClient(app, raise_server_exceptions=False)   # 처리되지 않은 예외도 응답(500 봉투)으로 받는다


@pytest.fixture(scope="module")
def mock():
    import mock_app
    mock_app.TOKEN = TOKEN["X-Internal-Token"]   # 목은 import 시점에 환경변수를 읽는다 — 판정 테스트와 같은 토큰으로
    return TestClient(mock_app.app, raise_server_exceptions=False)


def assert_envelope(r, status, code):
    assert r.status_code == status, r.text
    body = r.json()
    assert ENVELOPE_KEYS <= body.keys(), body
    assert body["success"] is False and body["data"] is None
    assert body["statusCode"] == status and body["code"] == code
    assert body["timestamp"].endswith("+09:00")


# ── 봉투: 라우팅 404·405 · 처리되지 않은 예외 500 ──────────────────────────────────────────

@pytest.mark.parametrize("app_name", ["real", "mock"])
def test_unknown_route_and_method_are_enveloped(app_name, request):
    c = request.getfixturevalue(app_name)
    assert_envelope(c.get("/internal/nope", headers=TOKEN), 404, "NOT_FOUND")
    assert_envelope(c.get("/internal/ingest", headers=TOKEN), 405, "NOT_FOUND")   # BE와 같은 코드(405 → NOT_FOUND)


def test_unhandled_exception_is_500_envelope_without_internals(real, monkeypatch):
    from app import vectorstore

    def boom(*_args, **_kwargs):
        raise RuntimeError("chroma exploded at /data/vector/secret-path")

    monkeypatch.setattr(vectorstore, "ingest_document", boom)
    r = real.post("/internal/ingest", headers=TOKEN, json=VALID_INGEST)
    assert_envelope(r, 500, "INTERNAL_SERVER_ERROR")
    assert "secret-path" not in r.text and "RuntimeError" not in r.text   # B-8 — 스택·경로는 로그에만


# ── 내부 토큰 (A-1) ─────────────────────────────────────────────────────────────

@pytest.mark.parametrize("app_name", ["real", "mock"])
@pytest.mark.parametrize("token", ["", "test-toke", "test-token-x", "TEST-TOKEN"])
def test_wrong_token_is_401(app_name, token, request):
    c = request.getfixturevalue(app_name)
    assert_envelope(c.post("/internal/ingest", headers={"X-Internal-Token": token}, json=VALID_INGEST), 401, "UNAUTHORIZED")


def test_token_compare_is_constant_time():
    """비교는 hmac.compare_digest — 응답 시간으로 토큰을 한 글자씩 맞히지 못하게 (코드 고정)"""
    import inspect

    from app import http
    src = inspect.getsource(http.require_internal_token)
    assert "compare_digest" in src and "!= expected" not in src


# ── 요청 검증: null · FOLLOWUP 질문 · Literal ─────────────────────────────────────

@pytest.mark.parametrize("app_name", ["real", "mock"])
@pytest.mark.parametrize("patch", [
    {"question": None},                                  # BE가 새 분석에서 null을 보내는 실수 — compose에서야 드러나던 결함
    {"history": None},
    {"postingTitle": None},
    {"mode": "SUMMARY"},
    {"mode": "FOLLOWUP", "question": ""},               # SPEC §4.3 후속 질문은 question 필수
    {"mode": "FOLLOWUP", "question": "   "},
    {"question": "가" * 1001},
])
def test_analyze_rejects_invalid_body(app_name, patch, request):
    c = request.getfixturevalue(app_name)
    assert_envelope(c.post("/internal/analyze/stream", headers=TOKEN, json={**VALID_ANALYZE, **patch}), 400, "VALIDATION_ERROR")


@pytest.mark.parametrize("app_name", ["real", "mock"])
@pytest.mark.parametrize("patch", [{"docType": "CV"}, {"title": None}, {"title": "t" * 101}, {"text": ""}, {"ownerUuid": None}])
def test_ingest_rejects_invalid_body(app_name, patch, request):
    c = request.getfixturevalue(app_name)
    assert_envelope(c.post("/internal/ingest", headers=TOKEN, json={**VALID_INGEST, **patch}), 400, "VALIDATION_ERROR")


@pytest.mark.parametrize("app_name", ["real", "mock"])
def test_broken_json_is_400_envelope(app_name, request):
    c = request.getfixturevalue(app_name)
    r = c.post("/internal/ingest", headers={**TOKEN, "Content-Type": "application/json"}, content=b"{not json")
    assert_envelope(r, 400, "VALIDATION_ERROR")


@pytest.mark.parametrize("app_name", ["real", "mock"])
def test_delete_without_owner_is_400_envelope(app_name, request):
    c = request.getfixturevalue(app_name)
    assert_envelope(c.delete("/internal/documents/12", headers=TOKEN), 400, "VALIDATION_ERROR")


def test_mock_accepts_what_real_accepts(mock):
    """(지킴) 정상 본문은 목도 통과 — REPORT(question "") · FOLLOWUP(question 있음)"""
    assert mock.post("/internal/ingest", headers=TOKEN, json=VALID_INGEST).status_code == 201
    assert mock.post("/internal/analyze/stream", headers=TOKEN, json=VALID_ANALYZE).status_code == 200
    follow = {**VALID_ANALYZE, "mode": "FOLLOWUP", "question": "뭐부터?", "history": [{"role": "USER", "content": "q"}]}
    assert mock.post("/internal/analyze/stream", headers=TOKEN, json=follow).status_code == 200
