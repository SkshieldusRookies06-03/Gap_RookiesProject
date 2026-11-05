# T-021 — 내 문서 화면과 useUpload 훅을 완성한다

**담당:** FE-화면 · **브랜치:** `feature/frontend` · **예상:** D2 · **선행:** T-009

## [배경]
SPEC.md §4.2 · §5 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
내 문서 화면과 useUpload 훅을 완성한다.

## [수용 기준]
- [ ] `src/pages/DocumentsPage.test.jsx` 4개 green
- [ ] 타입 탭 · 정렬 · 페이지 · 업로드(클라이언트 검증 .md/.txt·200KB) · 제목 수정 · 삭제 확인
- [ ] `useUpload` = `{ upload, uploading, error }`
- [ ] 제목은 텍스트 렌더(F-1)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-021` 무출력

## [제약]
- 수정 허용: `frontend/src/pages/DocumentsPage.jsx` · `frontend/src/pages/Documents.module.css` · `frontend/src/hooks/useUpload.js` · `frontend/src/hooks/useUpload.test.js`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-021]`

## [확인 명령]
```bash
cd frontend && npx vitest run src/pages/DocumentsPage.test.jsx
```
