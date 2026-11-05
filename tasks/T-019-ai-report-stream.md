# T-019 — REPORT 모드 단일 경로(load → generate) 스트림을 만든다

**담당:** AI · **브랜치:** `feature/ai-T-019` · **예상:** D2 · **선행:** T-018

## [배경]
SPEC.md §6.2 · ADR-08 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
REPORT 모드 단일 경로(load → generate) 스트림을 만든다 — 분기는 T-029.

## [수용 기준]
- [ ] `pytest -q` 전부 green (owner 필터·삭제·장애 → event: error 포함)
- [ ] token data는 `app.http.sse()`로(JSON 문자열)
- [ ] system 슬롯에 지시 · 자료는 `<자료>…</자료>` 안 · 리포트 형식 SPEC §4.3
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-019` 무출력

## [제약]
- 수정 허용: `ai-module/app/graph.py` · `ai-module/app/vectorstore.py` · `ai-module/app/providers.py`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-019]`

## [확인 명령]
```bash
cd ai-module && pytest -q
```
