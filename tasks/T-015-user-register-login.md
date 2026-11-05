# T-015 — User 엔티티·가입·로그인(+감사 이벤트 발행). **D2 오전 우선**

**담당:** 팀장(BE-인증) · **브랜치:** `feature/lead-T-015` · **예상:** D2 · **선행:** T-004

## [배경]
SPEC.md §4.1 · §1 인증 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
User 엔티티·가입·로그인(+감사 이벤트 발행). **D2 오전 우선** — BE-기능 엔티티가 User를 참조한다.

## [수용 기준]
- [ ] `AuthAcceptanceTest` ① ② green
- [ ] BCrypt · subject = uuid · 성공·실패 감사 이벤트 발행
- [ ] 없는 이메일도 같은 401
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-015` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/auth/` · `backend/src/main/java/com/jobgap/user/` · `backend/src/test/java/com/jobgap/auth/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-015]` · 전면 재작성 금지
- 참고: 운영 업무는 이날 데일리 10분으로 줄인다

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=AuthAcceptanceTest
```
