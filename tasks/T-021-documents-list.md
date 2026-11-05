# T-021 — 내 문서 목록

**담당:** FE-화면 · **브랜치:** `feature/fe-screens-T-021` · **예상:** D2 · **선행:** T-009

## [배경]
SPEC.md §4.2 · §5 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
내 문서 목록 — 탭·정렬·페이지·상태 넷.

## [수용 기준]
- [ ] `src/pages/DocumentsPage.test.jsx` 4 green
- [ ] 제목 텍스트 렌더(F-1) · `seams/smoke.md` 3번 줄
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-021` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `frontend/src/pages/DocumentsPage.jsx` · `frontend/src/pages/Documents.module.css`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-021]` · 전면 재작성 금지
- 참고: 업로드·수정·삭제는 T-057

## [확인 명령]
```bash
cd frontend && npx vitest run src/pages/DocumentsPage.test.jsx
```
