# 역할 시트 — 팀장

> 정본은 `SPEC.md`. 이 시트는 요약이다 — 다르면 SPEC이 이긴다. 티켓 지시서는 `tasks/T-###-*.md`.

## 0. 내 판정 테스트 (지금 red인 것이 내 일이다)
`frontend/src/api/*.test.js` 9(이미 green — 깨지 않게) · `src/pages/DocumentsPage.test.jsx` 4(red → T-021)

## 1. 한 줄
팀을 굴린다(일정·데일리·자르기 결정·발표) + FE 화면 4개와 프론트 공용(api·authStore·컴포넌트)을 만든다.

## 2. 내 파일 / 안 건드리는 파일
- 소유: `frontend/` 전체(분석 화면·useChatStream·chatStore 제외) · `README.md` · `tasks/` · `docs/1-*`
- 안 건드림: `backend/` · `ai-module/` · `frontend/src/pages/analysis/` · `src/hooks/useChatStream.js`(FE-분석) · 판정 테스트 파일
- 공용 파일을 고쳐야 하면 그 오너에게 티켓으로 넘긴다 (`node seams/check-scope.mjs <티켓>`이 잡는다)

## 3. 내 계약 상대
소비: `/api/**`(SPEC §4) — 목 `node mock/server.mjs` · 공급: `api/client.js`·`streamPost`·`sse.js`를 FE-분석이 쓴다

## 4. 내 티켓 순서
T-002 → T-003(D1 저녁 SPEC 승인) → T-009 → T-020 → T-021 → T-031 → T-040(D4 아침 자르기) → T-049(D5 동결) → T-050(발표)

## 5. 내가 쓰는 문서 (내 절 = 내 커밋)
1번 프로젝트계획서 전부 · 발표 자료 취합 · 일일보고·회고 취합

## 6. 내 명령어
```bash
cd frontend && npm ci && npm run dev   # VITE_API_URL=http://localhost:8080 + node mock/server.mjs
npx vitest run src/api src/pages
node seams/check-scope.mjs T-021
```

## 7. 막힐 곳
- 화면이 비면 → 콘솔의 CSP·CORS 오류부터(5173 고정 · strictPort)
- 로그인했는데 새로고침하면 401 → access는 메모리만이다 · Protected는 refresh 유무로 판단, 첫 요청의 TOKEN_EXPIRED가 refresh를 부른다
- 제목에 `<img …>`가 그림으로 보이면 F-1 발견 — JSX `{title}`로만 렌더

## 8. 발표에서 내가 말하는 한 문장
"기능 3개에 범위를 묶고, 평가표 61행을 티켓으로 바꿔 6일 안에 전부 동작하게 만들었다."

## 9. 매일
아침: 그날 티켓 확인 · 저녁: 내 PR 머지 + `node scripts/check-sec-deploy.mjs` 무출력 + 1커밋 이상(개인 평가) · 막히면 30분 안에 채널에.
