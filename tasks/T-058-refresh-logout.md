# T-058 — refresh 회전(SHA-256 해시 저장)과 로그아웃

**담당:** 팀장(BE-인증) · **브랜치:** `feature/lead-T-058` · **예상:** D2 · **선행:** T-015

## [배경]
SPEC.md §4.1 · §1 인증 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
refresh 회전(SHA-256 해시 저장)과 로그아웃.

## [수용 기준]
- [ ] `AuthAcceptanceTest` ③ ④ green
- [ ] 재발급 시 이전 refresh 즉시 무효 · 로그아웃 = 해시 삭제
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-058` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/auth/` · `backend/src/main/java/com/jobgap/user/` · `backend/src/test/java/com/jobgap/auth/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-058]` · 전면 재작성 금지

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=AuthAcceptanceTest
```
