"""[AI T-018·T-019 · 기술 리드] 둘째 seam 판정 테스트 — SPEC §6 · 점검서 A-1·A-3. 이 파일은 고치지 않는다."""
import json
import re
import uuid

from conftest import TOKEN

EVENT = re.compile(r"^event:\s?(\w+)\r?\ndata:\s?(.*)$", re.M)


def events(text: str):
    return [(m.group(1), m.group(2)) for m in EVENT.finditer(text)]


def ingest(client, doc_id, owner, doc_type, text):
    return client.post("/internal/ingest", headers=TOKEN,
                       json={"documentId": doc_id, "ownerUuid": owner, "docType": doc_type, "title": "t", "text": text})


def analyze(client, owner, posting, resume, mode="REPORT", question=""):
    return client.post("/internal/analyze/stream", headers=TOKEN,
                       json={"ownerUuid": owner, "postingId": posting, "resumeId": resume, "postingTitle": "공고",
                             "mode": mode, "question": question, "history": []})


def test_health_without_token(client):
    """(지킴) /health는 토큰 없이 200 — HEALTHCHECK"""
    assert client.get("/health").json() == {"status": "UP"}


def test_internal_routes_require_token(client):
    """(지킴) 내부 경로는 토큰 없으면 401 봉투 (A-1)"""
    for method, path in [("post", "/internal/ingest"), ("post", "/internal/analyze/stream"), ("delete", "/internal/documents/1?ownerUuid=x")]:
        r = getattr(client, method)(path, **({"json": {}} if method == "post" else {}))
        assert r.status_code == 401, path
        assert r.json()["success"] is False and r.json()["code"] == "UNAUTHORIZED"


def test_ingest_returns_chunks(client):
    """① ingest 201 {documentId, chunks}"""
    owner = str(uuid.uuid4())
    r = ingest(client, "doc-ing", owner, "JOB_POSTING", "자격요건: Java, Spring Boot. " * 60)
    assert r.status_code == 201
    assert r.json()["documentId"] == "doc-ing" and r.json()["chunks"] >= 2


def test_report_stream_shape_and_owner_filter(client):
    """② REPORT 스트림: token(JSON 문자열) → sources(내 문서) → done · 다른 ownerUuid로는 그 문서가 안 나온다 (A-3)"""
    owner, other = str(uuid.uuid4()), str(uuid.uuid4())
    ingest(client, "p-1", owner, "JOB_POSTING", "자격요건: Java, Spring Boot. 우대: Kubernetes")
    ingest(client, "r-1", owner, "RESUME", "기술: Java, Spring Boot, React")
    ev = events(analyze(client, owner, "p-1", "r-1").text)
    names = [e for e, _ in ev]
    assert "token" in names and names[-1] == "done", names
    for e, d in ev:
        if e == "token":
            assert isinstance(json.loads(d), str), "token data는 JSON 문자열"
    sources = json.loads(next(d for e, d in ev if e == "sources"))
    assert {s["documentId"] for s in sources if s["type"] == "doc"} >= {"p-1", "r-1"}

    ev2 = events(analyze(client, other, "p-1", "r-1").text)
    src2 = json.loads(next((d for e, d in ev2 if e == "sources"), "[]"))
    assert not [s for s in src2 if s.get("type") == "doc" and s["documentId"] in ("p-1", "r-1")], "남의 문서 조각이 섞였다 — owner_uuid 필터"


def test_delete_is_idempotent_and_removes(client):
    """③ DELETE 204 · 다시 지워도 204 · 지운 뒤에는 sources에 안 나온다"""
    owner = str(uuid.uuid4())
    ingest(client, "p-del", owner, "JOB_POSTING", "자격요건: Go")
    ingest(client, "r-del", owner, "RESUME", "기술: Go")
    assert client.delete(f"/internal/documents/p-del?ownerUuid={owner}", headers=TOKEN).status_code == 204
    assert client.delete(f"/internal/documents/p-del?ownerUuid={owner}", headers=TOKEN).status_code == 204
    ev = events(analyze(client, owner, "p-del", "r-del").text)
    src = json.loads(next((d for e, d in ev if e == "sources"), "[]"))
    assert "p-del" not in {s.get("documentId") for s in src}


def test_delete_needs_owner(client):
    """④ 다른 ownerUuid의 삭제 요청은 남의 청크를 지우지 못한다"""
    owner, other = str(uuid.uuid4()), str(uuid.uuid4())
    ingest(client, "p-own", owner, "JOB_POSTING", "자격요건: Rust")
    ingest(client, "r-own", owner, "RESUME", "기술: Rust")
    client.delete(f"/internal/documents/p-own?ownerUuid={other}", headers=TOKEN)
    ev = events(analyze(client, owner, "p-own", "r-own").text)
    src = json.loads(next((d for e, d in ev if e == "sources"), "[]"))
    assert "p-own" in {s.get("documentId") for s in src}
