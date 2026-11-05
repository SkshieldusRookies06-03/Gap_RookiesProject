# T-018 — vectorstore ingest·delete를 Chroma로 구현한다

**담당:** AI · **브랜치:** `feature/ai-T-018` · **예상:** D2 · **선행:** T-007

## [배경]
SPEC.md §6.1 · §6.4 · ADR-03 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
vectorstore ingest·delete를 Chroma로 구현한다.

## [수용 기준]
- [ ] `pytest -q tests/test_contract.py` 중 health·token·ingest·delete 계열 green
- [ ] 분할 500/50 · 메타 owner_uuid·document_id·doc_type·seq · 재적재 멱등 · 삭제 where에 owner_uuid
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-018` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `ai-module/app/vectorstore.py` · `ai-module/app/config.py`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-018]` · 전면 재작성 금지
- 참고: tests/ 는 기술 리드 파일

## [확인 명령]
```bash
cd ai-module && pytest -q
```
