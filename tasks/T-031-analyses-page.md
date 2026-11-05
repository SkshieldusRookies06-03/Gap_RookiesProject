# T-031 — 분석 기록 화면을 완성한다

**담당:** FE-화면 · **브랜치:** `feature/frontend` · **예상:** D3 · **선행:** T-009

## [배경]
SPEC.md §4.3 목록 · §5 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
분석 기록 화면을 완성한다.

## [수용 기준]
- [ ] 상태 넷 · INCOMPLETE = "중단됨" · 클릭 → `ROUTES.analysis(id)`
- [ ] 화면 상태 테스트 1(`AnalysesPage.test.jsx` — 내 테스트)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-031` 무출력

## [제약]
- 수정 허용: `frontend/src/pages/AnalysesPage.jsx` · `frontend/src/pages/Analyses.module.css` · `frontend/src/pages/AnalysesPage.test.jsx`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-031]`

## [확인 명령]
```bash
cd frontend && npm test
```
