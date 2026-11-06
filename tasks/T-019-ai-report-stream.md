# T-019 — REPORT 단일 경로(load → generate) 스트림

**담당:** AI · **브랜치:** `feature/ai` · **예상:** D2 · **선행:** T-018

## [배경]
SPEC.md §6.2 · ADR-08 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
REPORT 단일 경로(load → generate) 스트림.

## [수용 기준]
- [ ] `pytest -q tests/test_contract.py tests/test_failure.py` 7 green(장애 → event: error 포함) + `tests/test_rag_contract.py` `[T-019]` 2개(seq 순서 12개 · `<자료>` 격리·구분자 치환) green
- [ ] token은 `app.http.sse()` · system 슬롯 지시 · `<자료>` 구분자
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-019` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `ai-module/app/graph.py` · `ai-module/app/vectorstore.py` · `ai-module/app/providers.py`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-019]` · 전면 재작성 금지

## [확인 명령]
```bash
cd ai-module && pytest -q
```
