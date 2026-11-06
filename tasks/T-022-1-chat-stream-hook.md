# T-022-1 — useChatStream·분석 스토어·분석 화면 스타일

**담당:** FE-분석 · **브랜치:** `surim/frontend` → PR `feature/frontend` · **예상:** D2 · **선행:** T-010 · T-054

## [배경]
SPEC.md §4.3 · §5 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).
T-022를 150줄 규칙으로 쪼갠 첫 번째 몫(팀장 협의). 화면(`AnalysisPage.jsx`)은 T-022-2.
커밋 메시지의 대괄호는 `[T-022]`를 유지한다 — 평가표 게이트(R-IN02)가 `[T-숫자]`만 센다. 하위 번호는 요약에 `(T-022-1)`로 적는다.

## [목표]
useChatStream·분석 스토어·분석 화면 스타일.

## [수용 기준]
- [ ] `src/hooks/useChatStream.test.jsx` 4 green
- [ ] `chatStore.reset`은 이름·위치 유지(`Layout`이 부른다) · 새 필드도 비운다
- [ ] `Analysis.module.css` — 토큰만 · `@media (min-width: 768px)` · `@media (min-width: 1280px)`
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-022-1 origin/feature/frontend` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `frontend/src/hooks/useChatStream.js` · `frontend/src/stores/chatStore.js` · `frontend/src/pages/analysis/Analysis.module.css`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 (T-022-1) [T-022]` · 전면 재작성 금지

## [확인 명령]
```bash
cd frontend && npx vitest run src/hooks
```
