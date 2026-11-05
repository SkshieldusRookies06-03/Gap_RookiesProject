# T-057 — 업로드(useUpload)·제목 수정·삭제 확인

**담당:** FE-화면 · **브랜치:** `feature/fe-screens-T-057` · **예상:** D2 · **선행:** T-021

## [배경]
SPEC.md §4.2 · §5 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
업로드(useUpload)·제목 수정·삭제 확인.

## [수용 기준]
- [ ] `useUpload` = `{ upload, uploading, error }` · 클라이언트 검증 .md/.txt·200KB(서버가 정본)
- [ ] 삭제 확인 대화상자 · 수정 409 문구
- [ ] `seams/smoke.md` 4번 줄
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-057` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `frontend/src/hooks/useUpload.js` · `frontend/src/hooks/useUpload.test.js` · `frontend/src/pages/DocumentsPage.jsx` · `frontend/src/pages/Documents.module.css`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-057]` · 전면 재작성 금지
- 참고: D3 오전까지 넘어가도 된다

## [확인 명령]
```bash
cd frontend && npm test
```
