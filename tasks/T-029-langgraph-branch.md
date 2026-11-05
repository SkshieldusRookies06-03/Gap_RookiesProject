# T-029 — LangGraph 분기(grade → Tavily)와 FOLLOWUP 검색을 붙인다

**담당:** AI · **브랜치:** `feature/ai-T-029` · **예상:** D3 · **선행:** T-019

## [배경]
SPEC.md §6.2 · ADR-08 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
LangGraph 분기(grade → Tavily)와 FOLLOWUP 검색을 붙인다.

## [수용 기준]
- [ ] `StateGraph` + `add_conditional_edges` 1 · REPORT는 항상 web · FOLLOWUP은 relevance < GRADE_THRESHOLD일 때
- [ ] FOLLOWUP 검색은 `as_retriever(search_kwargs={k, filter})` + `similarity_search_with_relevance_scores`로 점수
- [ ] sources에 type web(url·title)
- [ ] `pytest -q` 그대로 green(키 없으면 Tavily 노드는 건너뛴다 — providers.tavily_enabled())
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-029` 무출력

## [제약]
- 수정 허용: `ai-module/app/graph.py` · `ai-module/app/vectorstore.py` · `ai-module/app/providers.py`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-029]`

## [확인 명령]
```bash
cd ai-module && pytest -q
```
