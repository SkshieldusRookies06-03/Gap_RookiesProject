# T-005 — 공통·보안 패키지와 판정 테스트가 첫 컴파일에서 깨지지 않게 대응한다

**담당:** 기술 리드·보안 · **브랜치:** `feature/techlead-T-005` · **예상:** D1 · **선행:** T-004

## [배경]
SPEC.md §1 · §4.4 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
공통·보안 패키지와 판정 테스트가 첫 컴파일에서 깨지지 않게 대응한다.

## [수용 기준]
- [ ] `SecurityAcceptanceTest`·`PiiMaskerTest` green
- [ ] 판정 테스트 전체가 컴파일된다(red는 정상)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-005` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/common/` · `backend/src/main/java/com/jobgap/security/` · `backend/src/test/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-005]` · 전면 재작성 금지

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest='SecurityAcceptanceTest,PiiMaskerTest'
```
