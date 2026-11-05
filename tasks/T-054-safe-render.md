# T-054 — 분석 화면 응답 안전 렌더 `ReportText`·`SourceChips`(완성본)를 FE-분석에 넘긴다

**담당:** 기술 리드·보안 · **브랜치:** `feature/techlead-T-054` · **예상:** D2 · **선행:** T-009

## [배경]
SPEC.md §5 · 점검서 F-1 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
분석 화면 응답 안전 렌더 `ReportText`·`SourceChips`(완성본)를 FE-분석에 넘긴다.

## [수용 기준]
- [ ] `npx vitest run src/pages/analysis` 4 passed
- [ ] FE-분석에게 import 방법 공유
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-054` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `frontend/src/pages/analysis/ReportText*` · `frontend/src/pages/analysis/SourceChips*`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-054]` · 전면 재작성 금지

## [확인 명령]
```bash
cd frontend && npx vitest run src/pages/analysis
```
