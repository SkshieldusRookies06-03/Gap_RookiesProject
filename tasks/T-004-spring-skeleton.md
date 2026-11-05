# T-004 — 백엔드 골격 팩을 내 이름으로 커밋하고 로컬 MariaDB에 붙여 기동한다

**담당:** 팀장(BE-인증 레인) · **브랜치:** `feature/be-auth-T-004` · **예상:** D1 · **선행:** —

## [배경]
SPEC.md §1 스택·BE 의존성 · tasks/D1-SETUP.md — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
백엔드 골격 팩을 내 이름으로 커밋하고 로컬 MariaDB에 붙여 기동한다.

## [수용 기준]
- [ ] start.spring.io(Maven · Java 17 · Spring Boot 3.3.x · 패키지 com.jobgap)로 만든 zip에서 **`mvnw`·`mvnw.cmd`·`.mvn/`만** 가져와 팩 위에 둔다
- [ ] `./mvnw -v` 가 돈다 · `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d database` 후 `SELECT VERSION()` = MariaDB
- [ ] `./mvnw test -Dtest=JobgapApplicationTests` green (Flyway V1·V2 적용 · 컨텍스트 기동)
- [ ] 컴파일 에러가 나면 출력 전체를 기술 리드에게 — 골격 코드는 이 환경에서 컴파일 검증 전이다
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-004` 무출력

## [제약]
- 수정 허용: `backend/pom.xml` · `backend/mvnw` · `backend/mvnw.cmd` · `backend/.mvn/` · `backend/src/main/resources/application.yml` · `backend/src/main/java/com/jobgap/JobgapApplication.java` · `backend/src/main/java/com/jobgap/auth/` · `backend/src/main/java/com/jobgap/user/` · `backend/src/main/java/com/jobgap/seed/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-004]`
- 참고: 테스트 DB 비밀번호: `.env`의 DB_PASSWORD를 `jobgap`으로 두거나 `TEST_DB_PASSWORD`를 맞춘다(src/test/resources/application-test.yml).

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=JobgapApplicationTests
```
