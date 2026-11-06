# T-029 — LangGraph 분기(grade → Tavily)와 FOLLOWUP 검색

**담당:** AI · **브랜치:** `feature/ai` · **예상:** D3 · **선행:** T-019

## [배경]
SPEC.md §6.2 · ADR-08 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
LangGraph 분기(grade → Tavily)와 FOLLOWUP 검색.

## [수용 기준]
- [ ] `StateGraph` + `add_conditional_edges` 1 · 노드 이름 ≠ 상태 키
- [ ] FOLLOWUP `as_retriever` + relevance score 분기 · sources type web
- [ ] `tests/test_rag_contract.py` `[T-029]` 6개(검색 범위·점수 · 남의 청크에 밀리지 않음(fetch_k) · 정확 일치 1등 · 후속 문맥 · grade 분기 둘) green · `pytest -q` 전체 green 유지
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-029` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `ai-module/app/graph.py` · `ai-module/app/vectorstore.py` · `ai-module/app/providers.py`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-029]` · 전면 재작성 금지

## [확인 명령]
```bash
cd ai-module && uv run pytest -q
```
