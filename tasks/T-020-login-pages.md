# T-020 — 로그인·회원가입 화면과 보호 라우트를 완성한다

**담당:** 팀장 · **브랜치:** `feature/lead-T-020` · **예상:** D2 · **선행:** T-009

## [배경]
SPEC.md §4.1 · §5 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
로그인·회원가입 화면과 보호 라우트를 완성한다.

## [수용 기준]
- [ ] 목으로 로그인 → /documents · 잘못된 비밀번호 → 사용자 문구 · 가입 400 fields[]를 필드 아래에
- [ ] authStore.setSession(data) · 로그아웃은 Layout이 처리
- [ ] 화면 상태 넷 · PropTypes
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-020` 무출력

## [제약]
- 수정 허용: `frontend/src/pages/LoginPage.jsx` · `frontend/src/pages/RegisterPage.jsx` · `frontend/src/pages/Auth.module.css` · `frontend/src/pages/LoginPage.test.jsx`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-020]`

## [확인 명령]
```bash
cd frontend && npm run build && npm test
```
