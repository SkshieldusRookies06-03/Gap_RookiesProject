# T-016 — 보안 설정을 실서버에서 관측하고 5번 명세 5.2(CSRF 사유)를 쓴다

**담당:** 기술 리드·보안 · **브랜치:** `feature/techlead-T-016` · **예상:** D2 · **선행:** T-005

## [배경]
SPEC.md §1 인증·헬스·SSE — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
보안 설정을 실서버에서 관측하고 5번 명세 5.2(CSRF 사유)를 쓴다.

## [수용 기준]
- [ ] JWT alg = HS256 · `/actuator/health` 200 · USER 토큰 `/actuator/metrics` 403 · CSP 헤더 — 결과를 SPEC §1 표 옆에
- [ ] `docs/5-` 5.2 CSRF 사유 문장(내 절 = 내 커밋)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-016` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/security/` · `backend/src/main/java/com/jobgap/common/` · `docs/5-*` · `SPEC.md`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-016]` · 전면 재작성 금지

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=SecurityAcceptanceTest
```
