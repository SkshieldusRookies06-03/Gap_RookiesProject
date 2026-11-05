# T-015 — User 엔티티와 가입·로그인·refresh 회전·로그아웃을 구현한다

**담당:** BE-인증 · **브랜치:** `feature/be-auth-T-015` · **예상:** D2 · **선행:** T-004

## [배경]
SPEC.md §4.1 · §1 인증 행 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
User 엔티티와 가입·로그인·refresh 회전·로그아웃을 구현한다.

## [수용 기준]
- [ ] `AuthAcceptanceTest` ①②③④ green (⑤ 잠금은 T-027)
- [ ] BCrypt(PasswordEncoder) · subject = uuid(JwtProvider.createAccessToken)
- [ ] Refresh는 `JwtProvider.newRefreshToken()` → DB에 `JwtProvider.sha256()`만 · 재발급 시 교체
- [ ] 로그인 성공·실패 시 감사 이벤트 발행(SecurityAuditListener 주석의 두 줄)
- [ ] 없는 이메일도 같은 401 문구
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-015` 무출력

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/auth/` · `backend/src/main/java/com/jobgap/user/` · `backend/src/test/java/com/jobgap/auth/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-015]`

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=AuthAcceptanceTest
```
