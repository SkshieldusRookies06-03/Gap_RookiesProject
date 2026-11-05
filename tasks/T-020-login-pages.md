# T-020 — 로그인·회원가입 화면과 보호 라우트

**담당:** FE-화면 · **브랜치:** `feature/frontend` · **예상:** D2 · **선행:** T-009

## [배경]
SPEC.md §4.1 · §5 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
로그인·회원가입 화면과 보호 라우트.

## [수용 기준]
- [ ] 목으로 로그인 → /documents · 실패 문구 · 가입 400 fields[]를 필드 아래
- [ ] `seams/smoke.md` 1~2번 줄 통과
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-020` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `frontend/src/pages/LoginPage.jsx` · `frontend/src/pages/RegisterPage.jsx` · `frontend/src/pages/Auth.module.css` · `frontend/src/pages/LoginPage.test.jsx`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-020]` · 전면 재작성 금지

## [확인 명령]
```bash
cd frontend && npm run build && npm test
```
