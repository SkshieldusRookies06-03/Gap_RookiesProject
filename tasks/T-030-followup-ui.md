# T-030 — 후속 질문·기록 재진입(hydrate)·분석 화면 상태 테스트

**담당:** FE-분석 · **브랜치:** `feature/fe-analysis-T-030` · **예상:** D3 · **선행:** T-022

## [배경]
SPEC.md §5 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
후속 질문·기록 재진입(hydrate)·분석 화면 상태 테스트.

## [수용 기준]
- [ ] /analyses/:id 진입 시 messages → hydrate · 스트리밍 중 재로딩 금지
- [ ] `pages/analysis/AnalysisPage.test.jsx` 1(내 테스트)
- [ ] `seams/smoke.md` 6번 줄
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-030` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `frontend/src/pages/analysis/AnalysisPage.jsx` · `frontend/src/pages/analysis/AnalysisPage.test.jsx` · `frontend/src/hooks/useChatStream.js` · `frontend/src/stores/chatStore.js`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-030]` · 전면 재작성 금지

## [확인 명령]
```bash
cd frontend && npm test
```
