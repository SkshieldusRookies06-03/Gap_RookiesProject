# T-009 — 프론트 골격 팩(Vite·라우터·api 클라이언트·SSE 파서·authStore·공용 컴포넌트·토큰·테스트 설정)을 커밋한다

**담당:** FE-화면 · **브랜치:** `feature/frontend` · **예상:** D1 · **선행:** —

## [배경]
SPEC.md §5 · tasks/D1-SETUP.md — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
프론트 골격 팩(Vite·라우터·api 클라이언트·SSE 파서·authStore·공용 컴포넌트·토큰·테스트 설정)을 커밋한다.

## [수용 기준]
- [ ] `npm ci && npm run build` 성공
- [ ] `npx vitest run src/api` green (client·sse 판정 9개)
- [ ] `VITE_API_URL=http://localhost:8080 npm run dev` + `node mock/server.mjs` 로 화면이 뜬다
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-009` 무출력

## [제약]
- 수정 허용: `frontend/package.json` · `frontend/package-lock.json` · `frontend/vite.config.js` · `frontend/index.html` · `frontend/.gitignore` · `frontend/src/main.jsx` · `frontend/src/App.jsx` · `frontend/src/routes.js` · `frontend/src/api/` · `frontend/src/components/` · `frontend/src/styles/` · `frontend/src/stores/authStore.js` · `frontend/src/pages/LoginPage.jsx` · `frontend/src/pages/RegisterPage.jsx` · `frontend/src/pages/DocumentsPage.jsx` · `frontend/src/pages/AnalysesPage.jsx` · `frontend/src/hooks/useUpload.js` · `frontend/src/test/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-009]`
- 참고: `src/pages/DocumentsPage.test.jsx`·`src/hooks/useChatStream.test.jsx`는 기술 리드가 커밋한다(판정 — 내 수정 허용 밖).

## [확인 명령]
```bash
cd frontend && npm ci && npm run build && npx vitest run src/api
```
