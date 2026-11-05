# T-018 — vectorstore

**담당:** AI · **브랜치:** `feature/ai` · **예상:** D2 · **선행:** T-007

## [배경]
SPEC.md §6.1 · §6.4 · ADR-03 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
vectorstore.py의 ingest·delete를 Chroma로 구현한다.

## [수용 기준]
- [ ] `pytest -q tests/test_contract.py` 중 health·token·ingest·delete 계열 green
- [ ] 분할 `RecursiveCharacterTextSplitter(500, 50)` · 메타 owner_uuid·document_id·doc_type·seq · 같은 id 재적재 = 지우고 다시
- [ ] 삭제는 `where={"$and":[{"document_id":…},{"owner_uuid":…}]}`
- [ ] `node seams/check-ai.mjs http://127.0.0.1:8000` ingest·delete 행 green(실물)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-018` 무출력

## [제약]
- 수정 허용: `ai-module/app/vectorstore.py` · `ai-module/app/config.py` · `ai-module/requirements.txt`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-018]`
- 참고: 테스트는 키 없이 돈다(LLM_PROVIDER=fake). tests/ 는 기술 리드 파일 — 고치지 않는다.

## [확인 명령]
```bash
cd ai-module && pytest -q
uvicorn app.main:app --port 8000 & AI_INTERNAL_TOKEN=… node seams/check-ai.mjs http://127.0.0.1:8000
```
