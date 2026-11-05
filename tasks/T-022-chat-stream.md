# T-022 — useChatStream과 분석 화면 기본(선택 → 스트리밍 → 중단)

**담당:** FE-분석 · **브랜치:** `feature/fe-analysis-T-022` · **예상:** D2 · **선행:** T-010 · T-054

## [배경]
SPEC.md §4.3 · §5 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
useChatStream과 분석 화면 기본(선택 → 스트리밍 → 중단).

## [수용 기준]
- [ ] `src/hooks/useChatStream.test.jsx` 4 green
- [ ] `ReportText`·`SourceChips`를 import해서 렌더(고치지 않음)
- [ ] `seams/smoke.md` 5번 줄
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-022` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `frontend/src/hooks/useChatStream.js` · `frontend/src/stores/chatStore.js` · `frontend/src/pages/analysis/AnalysisPage.jsx` · `frontend/src/pages/analysis/Analysis.module.css`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-022]` · 전면 재작성 금지

## [확인 명령]
```bash
cd frontend && npx vitest run src/hooks
```
