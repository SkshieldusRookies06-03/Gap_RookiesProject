"""[AI T-019] 장애 경로 — 스트림이 열린 뒤 LLM 장애는 event: error 봉투로 끝난다(SPEC §1). 이 파일은 고치지 않는다."""
import json
import uuid

from conftest import TOKEN
from test_contract import analyze, events, ingest


def test_llm_failure_becomes_error_event(client, monkeypatch):
    owner = str(uuid.uuid4())
    ingest(client, "p-f", owner, "JOB_POSTING", "자격요건: Java")
    ingest(client, "r-f", owner, "RESUME", "기술: Java")
    monkeypatch.setenv("LLM_PROVIDER", "fail")
    r = analyze(client, owner, "p-f", "r-f")
    assert r.status_code == 200
    ev = events(r.text)
    assert ev and ev[-1][0] == "error", ev
    body = json.loads(ev[-1][1])
    assert body["code"] == "AI_UNAVAILABLE" and body["success"] is False and body["timestamp"]
