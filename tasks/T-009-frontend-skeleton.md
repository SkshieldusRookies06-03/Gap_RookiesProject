# T-009 — 프론트 골격을 받아 빌드·공용 테스트·목 연결을 확인한다

**담당:** FE-화면 · **브랜치:** `feature/frontend` · **예상:** D1 · **선행:** T-001

## [배경]
SPEC.md §5 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
프론트 골격을 받아 빌드·공용 테스트·목 연결을 확인한다.

## [수용 기준]
- [ ] `npm ci && npm run build` 성공
- [ ] `npx vitest run src/api` 22 passed(공용 9 + 세션·SSE 회귀 13)
- [ ] `npm run dev` + `node mock/server.mjs` 로 로그인 화면(TODO)이 뜬다
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-009` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `frontend/package.json` · `frontend/package-lock.json` · `frontend/src/api/` · `frontend/src/components/` · `frontend/src/styles/` · `frontend/src/routes.js` · `frontend/src/App.jsx`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-009]` · 전면 재작성 금지

## [확인 명령]
```bash
cd frontend && npm ci && npm run build && npx vitest run src/api
```
