# T-031 — 분석 기록 화면

**담당:** FE-화면 · **브랜치:** `feature/fe-screens-T-031` · **예상:** D3 · **선행:** T-009

## [배경]
SPEC.md §4.3 목록 · §5 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
분석 기록 화면.

## [수용 기준]
- [ ] 상태 넷 · INCOMPLETE = "중단됨" · 클릭 → `ROUTES.analysis(id)`
- [ ] `AnalysesPage.test.jsx` 1(내 테스트) · `seams/smoke.md` 7번 줄
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-031` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `frontend/src/pages/AnalysesPage.jsx` · `frontend/src/pages/Analyses.module.css` · `frontend/src/pages/AnalysesPage.test.jsx`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-031]` · 전면 재작성 금지

## [확인 명령]
```bash
cd frontend && npm test
```
