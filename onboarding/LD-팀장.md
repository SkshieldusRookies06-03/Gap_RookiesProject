# 레인 명세 — 팀장 (BE-인증 레인 + 팀 운영)

> 이 레인은 **BE-인증 구현 + 팀 운영**이다. 운영 업무(§9)는 하루 1~2시간 — BE 티켓(특히 D2 T-015)이 다른 레인을 막으므로 그날은 운영을 오전 데일리 10분으로 줄인다(T-015 참고 줄).
> 정본은 `SPEC.md`(§1 인증·로그인 보호 행 · §2 User·시드 · §4.1 · §4.4 · §7 S-02 · §8 팀장 행). 이 문서는 SPEC을 **구현 단위로 푼 것**이다 — 다르면 SPEC이 이긴다. 범위·수용 기준·확인 명령은 `tasks/T-###-*.md`가 정본.
> 판정 테스트(`backend/src/test/java/com/jobgap/acceptance/`)는 기술 리드 파일 — 고치지 않는다. 틀려 보이면 SPEC 문장과 대조한 뒤 기술 리드에게.

**내 브랜치·흐름** (근거: `onboarding/GitHub규약.md` §1·§3 · SPEC §1 커밋·브랜치 행)
- 내 브랜치 `feature/backend` — **BE-기능과 같이 쓴다**. 티켓마다 새 브랜치를 만들지 않는다. 필수 리뷰·승인·CODEOWNERS 없음(리뷰는 선택).
- 작업 전 `git pull origin feature/backend` → 커밋(`type(범위): 요약 [T-###]`) → push 전 `node seams/check-scope.mjs <내 티켓> origin/feature/backend` 무출력(티켓 둘이면 `T-015,T-058`)
- push 전 `git diff --stat origin/feature/backend...HEAD`로 본 코드(`backend/src/main` 등 비테스트) 150줄 이하 확인 — 넘으면 티켓을 쪼갠다
- PR `feature/backend → dev`(그 PR의 티켓 전부를 쉼표로 check-scope · 기준 기본값 `origin/dev`) → 통합 확인 뒤 `dev → main`

## 0. 판정 테스트 표

| 테스트 | 줄 | 요약 | 티켓 | D1 상태 |
|---|---|---|---|---|
| `AuthAcceptanceTest` (6) | ① `register` | 가입 201 · 비밀번호 BCrypt(`$2…`) · 같은 이메일 409 `DUPLICATE_EMAIL` · 형식 오류 400 `VALIDATION_ERROR` + `fields[]` | T-015 | red |
| | ② `login_storesOnlyHash` | access의 subject = uuid · `users.refresh_token_hash` = `JwtProvider.sha256(refresh)` | T-015 | red |
| | ③ `refresh_rotates` | 새 refresh ≠ 이전 · 이전 값으로 다시 → 401 `INVALID_REFRESH_TOKEN` | **T-058** | red |
| | ④ `logout_invalidatesRefresh` | 로그아웃 200 → 그 refresh로 refresh → 401 | **T-058** | red |
| | ⑤ `bruteForce_locks` | [S-02] 존재 계정 5회 401 `INVALID_CREDENTIALS` → 6번째는 **맞는 비밀번호여도** 423 `ACCOUNT_LOCKED` · `locked_until` not null | T-027 | red |
| | (지킴) `unknownEmail_neverLocks` | 없는 이메일은 6번 틀려도 전부 401 `INVALID_CREDENTIALS` | T-027 | red |
| `BoundaryAcceptanceTest` | `registerValidation` ([T-015]) | 이름 공백·21자 · 비밀번호 7·65자 · 이메일 형식 → 400 `fields[]`에 그 필드 · 경계 64자·20자 201 | T-015 | red |
| `JobgapApplicationTests` | `contextLoads` | 컨텍스트 + Flyway 적용 (CI 1단계 필수) | T-004 | 컴파일 후 green 목표 |
| `PiiMaskerTest` (6) | (기술 리드 T-017) | T-004 확인 명령에 같이 돈다 — 첫 컴파일 확인용 | T-004 확인 | green 목표 |
| `SecurityAcceptanceTest` (3) | (기술 리드) | 내가 깨지 않게만 — 401·403 봉투 | — | — |
| 단위 6클래스 | (기술 리드) | `JwtProviderTest`·`PageRequestsTest`·`ApiResponseJsonTest`·`GlobalExceptionHandlerTest`·`CorsConfigTest`·`PiiMaskerEdgeTest` — DB 없음 · CI 1단계 필수. **T-037에서 `GlobalExceptionHandler`를 고치면 `GlobalExceptionHandlerTest` 6개가 green으로 남아야 한다** | — | green |

`BoundaryAcceptanceTest`의 다른 테스트는 @DisplayName의 [T-###]가 담당 — 내 것은 `registerValidation`([T-015]) 하나.

확인: `cd backend && ./mvnw test -Dtest='AuthAcceptanceTest,BoundaryAcceptanceTest#registerValidation'` (DB: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d database`).

CI(`.github/workflows/ci.yml`) backend 1단계(필수) = `JobgapApplicationTests,PiiMaskerTest,PiiMaskerEdgeTest,GlobalExceptionHandlerTest,CorsConfigTest,JwtProviderTest,PageRequestsTest,ApiResponseJsonTest` ·
2단계 `mvn -B test` 전체는 D5까지 `continue-on-error`(red 허용) — D5 저녁 T-049에서 필수 전환을 요청한다.

## 1. 완료 정의 (D5 저녁 동결 시점)

- [ ] `AuthAcceptanceTest` 6개 전부 green + `BoundaryAcceptanceTest#registerValidation` green
- [ ] 가입 → 로그인 → 15분 뒤 `TOKEN_EXPIRED` → refresh 1회 → 재요청 성공 (프론트와 E2E 1회)
- [ ] Burp Intruder 10회 → 6번째부터 423 + 해제 시각(S-02 재현·재확인 캡처는 기술 리드가 `security/evidence/S-02/`에)
- [ ] 감사 로그: `LOGIN_SUCCESS`·`LOGIN_FAILURE`·`LOCK` 줄이 이메일 마스킹(`k***@e.com`)으로 찍힌다
- [ ] `SPRING_PROFILES_ACTIVE=seed`로 기동하면 시드 문서 4건이 AI에 적재된다(SeedIngestRunner)
- [ ] `docs/5-Backend개발명세서.md` `grep -c 'TODO(' docs/5-*` = 0 (T-044) · 커밋 메시지 90% 이상 `type(범위): 요약 [T-###]`
- [ ] 운영: SPEC 동결 v1(T-003) · 자르기 결정 기록(T-040) · EC2 클릭 점검(T-047) · 기능 동결 선언(T-049)

## 2. 만들/고칠 파일 (패키지 `com.jobgap`)

| 경로 (`backend/src/main/java/com/jobgap/…` · 따로 적은 것 제외) | 역할 | 티켓 | 상태 |
|---|---|---|---|
| `backend/mvnw` · `backend/mvnw.cmd` · `backend/.mvn/` · `backend/pom.xml` | 빌드 (start.spring.io에서 wrapper만 가져옴 · pom은 리포 것 유지) | T-004 | pom 있음 · mvnw **만들 것** |
| `user/User.java` | 엔티티 (§3 T-015 표) | T-015 · T-058 · T-027 | **만들 것** |
| `user/UserRepository.java` | `findByEmail` · `findByUuid` · `findByRefreshTokenHash` · `existsByEmail` | T-015 · T-058 | **만들 것** |
| `auth/AuthService.java` | register · login(T-015) · refresh · logout(T-058) · 잠금(T-027) | T-015 · T-058 · T-027 | 골격 있음(전부 `UnsupportedOperationException`) |
| `auth/AuthController.java` · `auth/AuthDtos.java` | 계약(시그니처 고정 · `@Valid` 이미 있음) | — | 있음 — 바꾸려면 SPEC PR |
| `seed/SeedIngestRunner.java` | 프로파일 seed: 전 문서 delete→ingest | T-027 | 골격 있음(TODO) |
| `common/GlobalExceptionHandler.java` | 빠진 400 매핑 줄만 추가(기술 리드 파일 · 리뷰 요청) | T-037 | 있음 |
| `backend/src/test/java/com/jobgap/auth/` | 내 단위 테스트(선택) | T-015 · T-058 · T-037 | 만들 것 |
| `README.md` · `docs/1-*` · `.github/PULL_REQUEST_TEMPLATE.md` | 팀 표 · 계획서 · PR 양식 | T-002 (README 실행 절차는 T-040) | 있음 |
| `docs/5-*` | 5번 Backend 명세(5절 제외) | T-044 | 있음(TODO 남음) |
| `tasks/BOARD.md` 결정 기록 표 · `tasks/`(버그 티켓) | 자르기·동결 기록 · EC2 버그 티켓 | T-040 · T-049 · T-047 | 있음 |
| `docs/07-발표자료.md` · `docs/08-qna.md` | 발표 대본 · 예상 질문 | T-050 | **만들 것** |
| `worklog/` · `docs/` 기여 표 | 회고 취합 | T-053 | — |

읽기만 하는 파일: `backend/src/main/resources/application.yml` — 내 값(`app.jwt.*` · `app.login.max-failures: 5` · `app.login.lock-minutes: 15`)은 이미 있다. 내 티켓의 수정 허용 밖이므로 바꿔야 하면 그 파일 오너에게.
쓰기만 하는 남의 파일: `security/JwtProvider`(createAccessToken · newRefreshToken · refreshTokenExpirationMs · sha256) ·
`security/AuditLog.locked` · `security/PiiMasker.maskEmail` · `common/BusinessException`·`ErrorCode` · `PasswordEncoder` 빈(SecurityConfig) ·
(T-027) BE-기능의 `DocumentRepository`·`ai/AiClient`(`ingest` · `deleteDocument` — id·uuid는 `String`).

## 3. 티켓별 구현 명세

각 절: 선행 · 수정 허용(티켓 그대로) · 수용 기준 요지 · 확인 명령(티켓 그대로) · 구현 지침. 모든 티켓 공통 수용 기준 셋은 생략하지 않는다 —
`node scripts/check-sec-deploy.mjs` 무출력 · `node seams/check-scope.mjs T-###` 무출력 · 본 코드 diff 150줄 이하.

### T-002 GitHub 리포 설정과 팀 핸들 확정 (D1 · 선행 T-001)
- 수정 허용: `README.md` · `docs/1-*` · `onboarding/GitHub규약.md` · `.github/PULL_REQUEST_TEMPLATE.md`
- 수용 기준: 협업자 7명 접근 · 브랜치 `main`·`dev`·`feature/backend`·`feature/frontend`·`feature/ai`·`feature/security`·`feature/infra` 확인 ·
  PR 흐름 `feature/* → dev → main` · main 직접 푸시 금지 · 강제 리뷰어/승인 필수 사용 안 함 · 머지 커밋 유지 · README 팀 표 · `docs/1-` 팀원 실명
- 확인 명령:
```bash
(GitHub Settings 화면 캡처를 PR 설명에)
```
- 절차는 §9의 T-002.

### T-003 SPEC 동결 회의 · v1 승인 (D1 저녁 · 선행 T-001)
- 수정 허용: `SPEC.md` (머리 한 줄 외에는 고치지 않는다)
- 수용 기준: 전원 소집 · 기술 리드 §2·§4·§6 낭독 10분 · 질문은 "고친다/그대로" 둘 중 하나로 결론 · SPEC 머리에 `동결 v1 · 2026-11-05` 한 줄 PR 승인
- 확인 명령:
```bash
git log -1 --format=%s -- SPEC.md
```
- 절차는 §9의 T-003.

### T-004 Spring 골격 · 첫 컴파일 (D1 · 선행 T-001)
- 수정 허용: `backend/mvnw` · `backend/mvnw.cmd` · `backend/.mvn/` · `backend/pom.xml`
- 수용 기준: start.spring.io(Maven · Java 17 · Boot 3.3.x)에서 `mvnw`·`mvnw.cmd`·`.mvn/`만 가져와 커밋 · `JobgapApplicationTests,PiiMaskerTest` green(DB: dev compose `database`) · 컴파일 에러는 출력 전체를 기술 리드에게
- 확인 명령:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d database
cd backend && ./mvnw test -Dtest='JobgapApplicationTests,PiiMaskerTest'
```
1. start.spring.io: Maven · Java 17 · Boot 3.3.x · group `com.jobgap` → zip에서 `mvnw`·`mvnw.cmd`·`.mvn/`만 리포 `backend/`에 둔다(pom은 리포 것 유지).
2. 테스트 DB 기본값 `jobgap/jobgap`(`backend/src/test/resources/application-test.yml`) — `.env`의 `DB_USER`/`DB_PASSWORD`가 다르면 `TEST_DB_USER`·`TEST_DB_PASSWORD`를 맞춘다. `.env`는 `cp .env.example .env` 후 `DB_PASSWORD`·`DB_ROOT_PASSWORD`·`JWT_SECRET`·`AI_INTERNAL_TOKEN`을 채운다(비면 compose가 기동 거부).
3. 컴파일 에러는 **출력 전체**를 기술 리드에게(골격은 컴파일 검증 전 — 기술 리드 T-005가 받는다).
- 커밋: `chore(be): Spring 골격·Maven wrapper [T-004]`

### T-015 User 엔티티·가입·로그인 + 감사 이벤트 (D2 오전 우선 · 선행 T-004)
- 수정 허용: `backend/src/main/java/com/jobgap/auth/` · `backend/src/main/java/com/jobgap/user/` · `backend/src/test/java/com/jobgap/auth/`
- 수용 기준: `AuthAcceptanceTest` ①② green · `BoundaryAcceptanceTest#registerValidation` green(이름 공백·21자 · 비밀번호 7·65자 · 경계 64·20자 통과) · BCrypt · subject = uuid · 성공·실패 감사 이벤트 발행 · 없는 이메일도 같은 401
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest='AuthAcceptanceTest,BoundaryAcceptanceTest#registerValidation'
```
- **D2 오전 우선**: BE-기능 T-013이 `User`를 참조한다 → `User`·`UserRepository`부터 먼저 머지해 BF 대기를 푼다.

**User 엔티티 ↔ V1 `users`** (전 필드 `@Column(name=…, nullable=…)` · snake_case · `@Table(name = "users")`)

| 필드 | 타입 | 컬럼 | 비고 |
|---|---|---|---|
| id | Long | id BIGINT AI | `@Id @GeneratedValue(strategy = IDENTITY)` |
| uuid | String | uuid CHAR(36) | `columnDefinition = "CHAR(36)"` · 가입 시 `UUID.randomUUID().toString()` |
| email | String | email VARCHAR(100) | unique (`uk_users_email`) |
| passwordHash | String | password_hash VARCHAR(100) | BCrypt |
| name | String | name VARCHAR(20) | |
| role | String | role VARCHAR(10) | "USER" (ADMIN은 시드·수동만) |
| failedLoginCount | int | failed_login_count INT | |
| lockedUntil | OffsetDateTime | locked_until DATETIME(6) NULL | |
| refreshTokenHash | String | refresh_token_hash CHAR(64) NULL | `columnDefinition = "CHAR(64)"` |
| refreshExpiresAt | OffsetDateTime | refresh_expires_at DATETIME(6) NULL | |
| createdAt | OffsetDateTime | created_at DATETIME(6) | `@PrePersist`에서 `OffsetDateTime.now()` |

- 엔티티 메서드로 상태를 바꾼다(서비스에서 setter 남발 금지): `rotateRefresh(String hash, OffsetDateTime exp)` · `clearRefresh()`(T-058) ·
  `recordFailure(int max, Duration lock)` · `recordSuccess()` · `isLocked(OffsetDateTime now)`(T-027).
- 시그니처(골격 그대로): `UserResponse register(RegisterRequest)` · `LoginResponse login(LoginRequest)` · `TokenResponse refresh(String)` · `void logout(String userUuid)`.
- 트랜잭션: `register` = `@Transactional` · `login` = **`@Transactional(noRollbackFor = BusinessException.class)`**(지금 붙여 둔다 — T-027 잠금 카운트가 401과 함께 커밋돼야 한다 · SPEC §1 로그인 보호 행).
- 규칙:
  - register: `existsByEmail` → 409 `DUPLICATE_EMAIL` · 동시 가입으로 DB UNIQUE(`uk_users_email`)가 깨지면 `GlobalExceptionHandler`가 이미 409 `DUPLICATE_EMAIL`로 바꾼다(`GlobalExceptionHandlerTest#duplicateEmail`) — 서비스에서 따로 catch하지 않는다 · 201은 컨트롤러가 이미 붙인다.
  - 형식 검증(`@Pattern` 이메일 · `@Size(min=8,max=64)` 비밀번호 · `@NotBlank @Size(max=20)` 이름)은 `AuthDtos`에 이미 있다 — 400 `fields[]`는 `GlobalExceptionHandler`가 만든다.
  - login: 이메일 없음 → 실패 이벤트 + 401 `INVALID_CREDENTIALS`(문구 동일 · 카운트 없음). 비밀번호 비교는 `passwordEncoder.matches`. 성공 → 토큰 발급(아래 조각) + 성공 이벤트.
- 감사 이벤트(로그인 성공·실패 — `SecurityAuditListener`가 `LOGIN_SUCCESS`·`LOGIN_FAILURE` 줄로 로그 · 이 프로젝트 로그인은 AuthenticationManager를 거치지 않으므로 직접 발행):
```java
private final ApplicationEventPublisher events;
private void audit(String email, boolean ok) {
    if (ok) events.publishEvent(new AuthenticationSuccessEvent(
            UsernamePasswordAuthenticationToken.authenticated(email, null, List.of())));
    else events.publishEvent(new AuthenticationFailureBadCredentialsEvent(
            UsernamePasswordAuthenticationToken.unauthenticated(email, null), new BadCredentialsException("bad credentials")));
}
```
- 토큰 발급 조각(T-058 refresh도 같은 조각을 쓴다):
```java
String access = jwtProvider.createAccessToken(user.getUuid(), user.getRole());
String refresh = jwtProvider.newRefreshToken();
user.rotateRefresh(JwtProvider.sha256(refresh), OffsetDateTime.now().plus(Duration.ofMillis(jwtProvider.refreshTokenExpirationMs())));
return new LoginResponse(access, refresh, new UserResponse(user.getUuid(), user.getEmail(), user.getName()));
```
- green: ①② + `registerValidation` · `node seams/check-api.mjs http://localhost:8080`(인증 행)
- 커밋: `feat(auth): User 엔티티·가입·로그인 [T-015]`

### T-058 refresh 회전(SHA-256 해시 저장)과 로그아웃 (D2 · 선행 T-015)
- 수정 허용: `backend/src/main/java/com/jobgap/auth/` · `backend/src/main/java/com/jobgap/user/` · `backend/src/test/java/com/jobgap/auth/`
- 수용 기준: `AuthAcceptanceTest` ③④ green · 재발급 시 이전 refresh 즉시 무효 · 로그아웃 = 해시 삭제
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest=AuthAcceptanceTest
```
- 근거: SPEC §1 인증 행(Refresh 14일 · SHA-256 해시로 `users.refresh_token_hash` · 재발급 시 교체) · §4.1 refresh·logout · ADR-02(사용자당 로그인 1곳).
- 트랜잭션: `refresh`·`logout` = `@Transactional`.
- refresh: `findByRefreshTokenHash(JwtProvider.sha256(token))` → 없음·`refreshExpiresAt` 지남 → 401 `INVALID_REFRESH_TOKEN` → 새 access + 새 refresh, **해시 교체**(`rotateRefresh` — T-015 토큰 조각) → `TokenResponse(access, refresh)`.
- logout: `findByUuid(userUuid)`(컨트롤러가 `@AuthenticationPrincipal AuthUser me`의 `me.uuid()`를 넘긴다) → `clearRefresh()`(해시·만료 null). 응답 `data: null`은 컨트롤러가 만든다.
- Access는 로그아웃 뒤에도 최대 15분 유효하다(필터가 DB를 보지 않음) — SPEC §7 잔여 위험. 고치지 않는다.
- green: ③④ · `node seams/check-api.mjs http://localhost:8080`(refresh 회전 행)
- 커밋: `feat(auth): refresh 회전·로그아웃 [T-058]`

### T-027 [S-02] 로그인 5회 잠금 + SeedIngestRunner (D3 · 선행 T-015 · 기술 리드 재현)
- 수정 허용: `backend/src/main/java/com/jobgap/auth/` · `backend/src/main/java/com/jobgap/user/` · `backend/src/main/java/com/jobgap/seed/`
- 수용 기준: `AuthAcceptanceTest` ⑤·(지킴) green · `noRollbackFor = BusinessException.class` · SeedIngestRunner: seed 프로파일 · `@Transactional(readOnly = true)` · BF의 리포지토리·AiClient는 호출만
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest=AuthAcceptanceTest
```
- **방어만 담은 커밋** — 기술 리드가 T-015 상태(잠금 없음)에서 Burp Intruder로 재현(`S-02/intruder-before.png`)한 뒤 머지한다(조치 전 이력이 남아야 점검서가 선다 · SPEC §7 S-02).
- 판정 순서(이 순서가 테스트 ⑤를 만든다):
```java
User user = userRepository.findByEmail(req.email()).orElse(null);
if (user == null) { audit(req.email(), false); throw new BusinessException(ErrorCode.INVALID_CREDENTIALS); }
OffsetDateTime now = OffsetDateTime.now();
if (user.isLocked(now)) {                                   // ① 잠금이 비밀번호 비교보다 먼저
    throw new BusinessException(ErrorCode.ACCOUNT_LOCKED, "로그인 5회 실패로 잠겼습니다. 해제: " + user.getLockedUntil().toLocalTime());
}
if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
    boolean lockedNow = user.recordFailure(maxFailures, Duration.ofMinutes(lockMinutes)); // 5회째에 locked_until 설정 · 카운트 0
    if (lockedNow) AuditLog.locked(user.getEmail());
    audit(req.email(), false);
    throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);   // 5번째도 401 — 423은 6번째부터
}
user.recordSuccess();                                         // failed=0 · lockedUntil=null
```
  - 값은 `application.yml` `app.login.max-failures`(5)·`app.login.lock-minutes`(15)를 `@Value`로 — SPEC §1 로그인 보호 행.
  - `noRollbackFor` 없으면 카운트가 롤백돼 ⑤가 영원히 401 — **가장 흔한 실패**.
- SeedIngestRunner(프로파일 `seed`): `@Transactional(readOnly = true)` 안에서 `documentRepository.findAll()` → 문서마다
  `aiClient.deleteDocument(id, ownerUuid)` → `aiClient.ingest(id, ownerUuid, docType.name(), title, content)`(id는 `String`) · 실패는 `log.warn`만(기동 계속 · 멱등 — SPEC §2 시드).
  `DocumentRepository`·`AiClient`는 BE-기능 파일 — **호출만**(수정 허용 밖 · BF T-013·T-024 머지 뒤).
- green: ⑤ · (지킴) · `SPRING_PROFILES_ACTIVE=seed ./mvnw spring-boot:run` 후 시드 문서로 분석 스트림에 sources
- 커밋 둘: `fix(security): [S-02] 로그인 5회 잠금 · B-5 [T-027]` / `feat(seed): 시드 문서 AI 적재 러너 [T-027]`
- 머지 뒤 채널에 알린다 → 기술 리드가 같은 요청으로 재확인(`intruder-after.png` · 감사 로그 `LOCK` 줄).

### T-037 400·415 경계 정리 (D4 · 선행 T-015)
- 수정 허용: `backend/src/main/java/com/jobgap/common/GlobalExceptionHandler.java` · `backend/src/test/java/com/jobgap/auth/`
- 수용 기준: size=0·정수 아님·JSON 형식 오류·빈 파일·UTF-8 아님 → 봉투 · 매핑 줄은 GlobalExceptionHandler에(기술 리드 리뷰)
- 확인 명령:
```bash
cd backend && ./mvnw test
```
- 확인할 입력(전부 봉투여야 한다 — 500·HTML 금지 · SPEC §4.4): `size=0`·`page=abc`(→ 400 · `PageRequests`·`MethodArgumentTypeMismatchException` 이미 매핑) ·
  JSON 깨진 본문(`HttpMessageNotReadableException` 이미 매핑) · Content-Type 누락·틀림(`HttpMediaTypeNotSupportedException` → 400 `VALIDATION_ERROR` 이미 매핑) ·
  multipart 형식 오류(`MultipartException` 이미 매핑) · 빈 파일 400·UTF-8 아님 415 `UNSUPPORTED_FILE`(BE-기능 `DocumentService.upload` — 안 되면 BF에 버그 티켓).
- 빠진 매핑만 `common/GlobalExceptionHandler.java`에 줄 추가(기술 리드 리뷰 · `GlobalExceptionHandlerTest` green 유지). 인증 테스트 보강은 `src/test/java/com/jobgap/auth/`.
- 확인 명령이 `./mvnw test` 전체라 남의 red(D4 전 미완 티켓)가 섞일 수 있다 — 내가 만든 red가 없는지만 본다(CI 2단계도 D5까지 red 허용).
- 커밋: `fix(common): 400 경계 입력 봉투 정리 [T-037]`

### T-040 자르기 결정 · README 실행 절차 (D4 아침 · 선행 T-033)
- 수정 허용: `tasks/BOARD.md` · `README.md`
- 수용 기준: 결정 한 줄을 BOARD D4에 · 자르는 순서 1→5만 · README 실행 절차(DevOps와)
- 확인 명령:
```bash
node scripts/check-rubric-p3.mjs
```
- 입력: 기술 리드 T-033의 `security/evidence/rubric-D3.txt`(MISS 목록). 절차는 §9의 T-040.

### T-044 5번 Backend 명세 실물 발췌(인증 절) (D5 · 선행 T-058)
- 수정 허용: `docs/5-*`
- 수용 기준: `docs/5-` 내 절 TODO 0
- 확인 명령:
```bash
grep -c 'TODO(' docs/5-*
```
- 문서 오너는 팀장(5절만 기술 리드 — 문서 머리 줄). 정본은 `backend/` 코드 · `application.yml` · `V1__schema.sql` · SPEC.
- 할 것: §4.1 Entity의 `User` "구현 예정 T-015" 표시를 지우고 실물로 · §4.3 `AuthService` 행 · §4.4 `UserRepository` · §4.5 트랜잭션(`login` `noRollbackFor`) ·
  인증 흐름(로그인 → 잠금 확인 → 비밀번호 → 토큰 · refresh 회전 · 로그아웃 해시 삭제) · 머리의 기준 커밋. BF 엔티티 행은 BE-기능에게 받아 붙인다.
- 확인 명령은 파일 전체를 센다. 지금 남은 `TODO(`는 셋 — §5.3 감사 로그 링크(D3·기술 리드) · §6 AiClient 발췌(D3·BE-기능) · §9 SBOM 요약(D4·기술 리드).
  5절·SBOM 줄은 기술 리드가 자기 티켓(T-016 · 수정 허용 `docs/5-*`)으로 닫고, §6 줄은 BE-기능 티켓에 `docs/5-*` 수정 허용이 없으므로 **BE-기능에게 발췌를 받아 내가 붙인다**.
- 커밋: `docs(be): 백엔드 명세 실물 발췌 [T-044]`

### T-047 EC2 전원 클릭 경로 1회 → 버그 티켓 (D5 · 선행 T-042)
- 수정 허용: `tasks/`
- 수용 기준: `seams/smoke.md` 전 줄을 EC2 주소로 · 버그는 티켓으로
- 확인 명령:
```bash
(smoke.md 체크 결과를 PR 설명에)
```
- DevOps T-042(EC2 배포) 머지 뒤 `http://<EC2>`에서 smoke.md 1~9번 줄을 순서대로(390·1280 뷰포트 · 콘솔 에러 0이 전제). 통과한 줄 번호를 PR 본문에.
- 실패한 줄마다 새 티켓 `tasks/T-###-*.md` — 기존 양식([배경]~[확인 명령])을 따르고 **`- 수정 허용:` 줄에 백틱 경로를 반드시** 적는다(없으면 `check-scope.mjs`가 exit 2로 그 티켓을 막는다). 담당은 smoke.md 오너 칸의 레인.
- `tasks/BOARD.md`는 생성 파일 — 손으로 행을 넣지 않는다(T-047 수정 허용은 `tasks/`이지만 BOARD 머리 규칙이 우선).
- 커밋: `chore(tasks): EC2 클릭 점검 버그 티켓 [T-047]`

### T-049 기능 동결 선언 · CI 2단계 필수 전환 (D5 저녁 · 선행 T-047)
- 수정 허용: `tasks/BOARD.md` · `.github/workflows/ci.yml`(2단계 `continue-on-error` 세 줄 삭제만 — DevOps와 함께 확인)
- 수용 기준: 채널 공지 · 이후 `fix:`만 · `ci.yml` 2단계 `continue-on-error` 세 줄 삭제(판정 테스트가 필수 단계로) · 빈칸 0이면 DevOps CD·K8s 가산 허락
- 확인 명령:
```bash
—
```
- 절차는 §9의 T-049. 결정은 BOARD 결정 기록 표에 한 줄.

### T-050 발표 35분 자료 · 리허설 2회 (D6 · 선행 T-049)
- 수정 허용: `docs/07-발표자료.md` · `docs/08-qna.md`
- 수용 기준: 자기 슬라이드는 자기가 · 수치마다 명령 근거 · 타이머 2회
- 확인 명령:
```bash
—
```
- 구성·규칙은 §9의 T-050 표.

### T-053 기여 내역·회고 취합 (D6 · 선행 T-050)
- 수정 허용: `worklog/` · `docs/`
- 수용 기준: `worklog/<이름>/회고.md` 각자 · 팀장은 `docs/` 기여 표
- 확인 명령:
```bash
git shortlog -sn --no-merges
```
- 각자 자기 회고 파일은 **자기 커밋**(개인 평가가 git 이력 — GitHub규약 머리). 나는 `git shortlog -sn --no-merges` 결과로 `docs/` 기여 표를 만든다.
- 커밋: `docs(retro): 기여 내역 표 [T-053]`

## 4. 받는 것 · 주는 것

| 방향 | 누구 | 무엇 | 언제 |
|---|---|---|---|
| 받음 | 기술 리드 | `JwtProvider`·`PasswordEncoder`·감사 리스너·`common/` | D1 (T-005) |
| 받음 | 기술 리드 | S-02 재현 완료 알림(조치 전 캡처) → 그 뒤 T-027 머지 | D3 |
| 받음 | 기술 리드 | `rubric-D3.txt` MISS 목록(T-033) → T-040 자르기 입력 | D3 저녁 |
| 받음 | BE-기능 | `DocumentRepository`·`AiClient` (SeedIngestRunner용) | D3 (T-013·T-024) |
| 받음 | DevOps | EC2 배포 주소(T-042) → T-047 | D5 |
| 줌 | BE-기능 | `User`·`UserRepository.findByUuid` — 서비스가 `AuthUser.uuid()`로 소유자를 찾는다 | **D2 오전** (BF T-013이 기다린다) |
| 줌 | FE-화면 | `/api/auth/**` 실물 — 목과 같은 모양(check-api 인증·refresh 행 green) | D2 저녁 (T-015·T-058) |
| 줌 | 기술 리드 | 9번 B-4·B-5 조치 문장 재료(T-058·T-027 커밋 diff) | D4 |
| 줌 | DevOps | CI 2단계 필수 전환 커밋(T-049) 확인 요청 · CD·K8s 가산 허락 | D5 저녁 |
| 받음 | BE-기능 | 5번 §6 AiClient 생성자 발췌(내가 T-044에서 붙인다) · BF 엔티티 행 | D5 |
| 줌 | 전원 | 동결 v1 · 자르기 결정 · 기능 동결 · 발표 대본 틀 | D1 · D4 · D5 · D6 |
| 공유 | `feature/backend` 브랜치 | BE-기능과 같이 쓴다 — 작업 전 pull · push 전 check-scope | 상시 |

## 5. 일정 (BOARD · ROADMAP 날짜 기준)

| 날 | BE-인증 | 운영 |
|---|---|---|
| D1 11/5 목 | T-004 · `JobgapApplicationTests,PiiMaskerTest` green | T-002 리포 설정(오전) · T-003 SPEC 동결(저녁) |
| D2 11/6 금 | 오전 `User`·`UserRepository` 먼저 머지(BF 대기 해소) → T-015 → T-058 | 데일리 10분만 |
| D3 11/9 월 | 기술 리드 S-02 재현 확인 → T-027 두 커밋 | 데일리 |
| D4 11/10 화 | T-037 · 동적 점검일에 Burp 재현 보조 | 데일리 · **T-040 자르기 결정(아침)** |
| D5 11/11 수 | T-044 | 데일리 · T-047 EC2 클릭 점검 · **T-049 저녁 기능 동결** · 발표 원고 취합 |
| D6 11/12 목 | 버그만 · 발표 Q&A "refresh 회전·잠금" 한 줄 | T-050 발표 리허설 2회 · T-053 기여·회고 취합 |

고정 일정(ROADMAP): D1 저녁 SPEC 동결 · D3 1차 통합 · D4 동적 점검일 · D5 저녁 기능 동결 · D6 리허설 2회 · 11/13 금 제출·발표.

## 6. 막힐 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| 기동 "JWT_SECRET는 32바이트 이상" | `.env` 비어 있음 | `openssl rand -base64 48` (`.env.example` 주석) |
| "Unsupported Database: MariaDB" | flyway-mysql 누락 | pom에 있음 — 지웠는지 확인 |
| validate 실패 `wrong column type … uuid` | String이 varchar로 기대 | `columnDefinition = "CHAR(36)"` / `"CHAR(64)"` |
| validate 실패 datetime | OffsetDateTime 저장 방식 | application.yml `timezone.default_storage: NORMALIZE`(있음) · 그래도면 `columnDefinition = "DATETIME(6)"` |
| ⑤가 계속 401 | 카운트가 401 예외와 함께 롤백 | `@Transactional(noRollbackFor = BusinessException.class)` |
| ⑤ 6번째가 401 | 잠금 확인을 비밀번호 비교 뒤에 함 | 순서: 잠금 → 비밀번호 |
| ② 해시 불일치 | refresh 원문 저장 또는 다른 해시 | `JwtProvider.sha256(refresh)`만 |
| ③ 이전 refresh가 200 | 해시를 교체하지 않음 | refresh에서도 `rotateRefresh(새 해시)` |
| logout 403 | `@PreAuthorize` authority 이름 | 필터가 `ROLE_` + role — role 값은 `USER`(접두어 없이 저장) |
| 감사 로그 안 찍힘 | 이벤트 미발행 | §3 T-015 `audit()` |
| 시드 로그인 실패 | V2 해시는 `Passw0rd!` | 대소문자 확인 |
| check-scope RED에 동료 파일 | 기준을 `origin/dev`로 돌림 | push 전에는 `origin/feature/backend` 기준(공유 브랜치) |

## 7. 내가 쓰는 문서 절

| 파일 · 절 | 티켓 | 정본(발췌 원본) |
|---|---|---|
| `docs/1-프로젝트계획서.md` 전부(팀 실명 · 일정 · 성공 기준) | T-002 · (마무리 T-053) | SPEC §0 · §8 · BOARD |
| `README.md` 팀 표 | T-002 | SPEC §8 |
| `README.md` 실행 절차(DevOps와 함께) | T-040 | compose · `.env.example` |
| `docs/5-Backend개발명세서.md` 5절 제외 전부(엔티티 규약 · 인증 흐름 · 트랜잭션) | T-044 | `user/User.java` · `AuthService` · SPEC §1 인증 행 |
| `docs/9-보안점검서.md` B-4·B-5 조치 문장(기술 리드 표에 넣을 문장 제공 — 파일은 기술 리드가 쓴다) | (T-058 · T-027 diff) | T-058 · T-027 커밋 diff |
| `docs/07-발표자료.md` · `docs/08-qna.md` | T-050 | §9 T-050 표 · 각 레인 원고 |
| `docs/` 기여 표 | T-053 | `git shortlog -sn --no-merges` |

## 8. 코딩 에이전트 지시서 예시 (T-027)

```
[배경] SPEC.md §1 "로그인 보호" 행 · §4.1 login · §4.4 423 행 · §7 S-02 행을 그대로 붙인다.
       현재 AuthService.login은 T-015 구현(잠금 없음). 판정 테스트 AuthAcceptanceTest ⑤·(지킴)이 red.
[목표] 존재하는 계정만 실패 5회 → 15분 잠금 · 6번째부터 맞는 비밀번호여도 423 ACCOUNT_LOCKED.
[수용 기준]
 - ./mvnw test -Dtest=AuthAcceptanceTest 6개 green
 - 판정 순서: 사용자 조회 → 잠금 확인 → 비밀번호 비교 → 실패 기록(5회째 locked_until=now+15m, 카운트 0) → 401
 - login에 @Transactional(noRollbackFor = BusinessException.class)
 - 잠금 시 AuditLog.locked(email)
[제약] 수정 허용: backend/src/main/java/com/jobgap/auth/ · backend/src/main/java/com/jobgap/user/ · backend/src/main/java/com/jobgap/seed/
       acceptance/ 폴더·security/·common/은 수정 금지 · 커밋하지 말 것 · 전면 재작성 금지
[확인 명령] cd backend && ./mvnw test -Dtest=AuthAcceptanceTest
```

## 9. 팀장 운영 업무 (BE-인증과 병행)

### 리포 설정 — T-002 (D1 오전)
1. GitHub 협업자 7명의 저장소 접근 권한을 확인한다. 담당별 브랜치 `feature/backend`, `feature/frontend`, `feature/ai`, `feature/security`, `feature/infra`와 `main`·`dev`가 있는지 확인한다.
2. `main`은 `dev`에서 PR로만(직접 푸시 금지), `dev`는 `feature/*`에서 PR로 통합하도록 운영한다. 승인 필수·Code Owners 리뷰·자동 리뷰어는 설정하지 않는다 · 머지는 "Create a merge commit"(GitHub규약 §5).
3. README 팀 표 채우기 · `docs/1-프로젝트계획서.md` §1·§2 초안(팀원 실명 칸 `TODO(D1·팀장)`).
커밋: `chore(setup): 팀 핸들·보호 규칙 [T-002]`

### SPEC 동결 — T-003 (D1 저녁 · 20분)
1. 전원 소집 → 기술 리드가 SPEC §2·§4·§6을 10분 낭독.
2. 질문은 그 자리에서 "SPEC을 고친다 / 그대로 간다" 둘 중 하나로 결론 — 고치면 기술 리드가 즉시 PR.
3. 팀장이 SPEC 머리에 `동결 v1 · 2026-11-05` 한 줄 PR 승인 = 동결. 이후 계약 변경은 SPEC §9 규약(D3 이후는 팀장·영향 레인 사전 합의 기록).

### 데일리 10분 (D2~D6 매일 아침 · 순서 고정)
1. (1분) ROADMAP·BOARD 오늘 칸 띄우기 — 어제 머지 안 된 티켓만 읽는다.
2. (5분) 1인 30초: 어제 머지한 것 · 오늘 티켓 번호 · 막힌 것(있으면 "누구랑 회의 뒤에 본다"까지만).
3. (2분) 기술 리드: `node seams/check-scope.mjs --overlap <오늘 티켓들>` 결과 · 게이트 red 한 줄.
4. (2분) 팀장: 오늘 자를 것/옮길 것 결정 한 줄을 BOARD 결정 기록 표에.
막힘 해결은 회의 밖에서 2인으로. 30분 넘게 막힌 사람은 채널에 올린다(onboarding/README 다섯 줄 4번).

### 자르기 결정 — T-040 (D4 아침)
1. 기술 리드의 `node scripts/check-rubric-p3.mjs` MISS 목록(T-033 `rubric-D3.txt`) = ⓪ 빈칸.
2. D5 저녁까지 못 닫을 칸이 있으면 스킬 P3-6 "넘치면 자르는 순서" 1→5 순서로만 자른다
   (K8s·CD → 분석 기록 화면 → 골든셋 10→5 → 캡처·테스트 축소 → Tavily 분기는 마지막까지 유지).
3. 자르지 않는 것: 스트리밍 E2E · 보안 S-ID 3건 · EC2 compose · 문서 9종 · 인증 확정값.
4. 결정을 `tasks/BOARD.md` 맨 아래 "결정 기록" 표에 날짜와 함께 한 줄 · 제출 문서에는 "기간 대비 범위 조정"으로.
5. 같은 날 README 실행 절차를 DevOps와 맞춰 적는다(정본: compose 파일 · `.env.example`).

### EC2 클릭 점검 — T-047 (D5)
§3 T-047 — smoke.md 1~9를 EC2 주소로 · 실패 줄은 버그 티켓. 이 결과가 T-049 동결 선언의 입력이다.

### 기능 동결 선언 — T-049 (D5 저녁)
채널에 "기능 동결 — 이후 PR은 `fix:`만, 새 화면·필드·엔드포인트 금지"(SPEC §9 · GitHub규약 §5) ·
`.github/workflows/ci.yml` 2단계 `continue-on-error` 세 줄(backend·frontend·ai)을 **내가 지운다**(T-049 수정 허용 · 머리 주석 "D5에 지워 필수로") — 커밋 전에 DevOps에게 확인.
빈칸이 0이면 DevOps에 CD·K8s 가산 착수 허락. 결정을 BOARD 결정 기록 표에 한 줄.

### 발표 35분 — T-050 (D6 · 리허설 2회)

| 단계(분) | 슬라이드 | 발표자 |
|---|---|---|
| 소개 (6) | 목적·3대 목적 요약 · 팀·레인·부오너 · 아키텍처(신뢰 경계) | 팀장 · 팀장 · DevOps |
| 시연 (10) | E2E(가입→업로드→스트리밍, 영상 먼저 → 라이브) · 보안 시연(S-01 IDOR·S-02 Brute Force Burp 화면 + S-03 마스킹 전후 한 장) · 측정 수치 1장 | FE-화면·FE-분석 · 기술 리드 · AI |
| 과정 (7) | CI/CD 흐름 · 보안 점검 요약 · RAG 설계와 품질 · 도전과 해결 2건 | DevOps · 기술 리드 · AI · BE |
| 소감 (8) | 1인 1.5분 | 각자 |
| Q&A (4) | 예상 질문 | 질문 받은 레인 |

규칙: 자기 레인 슬라이드는 자기가 만들고 말한다 · 슬라이드의 숫자마다 그 숫자를 만든 명령 한 줄을 대본에 적는다(없으면 슬라이드에서 뺀다) ·
리허설 2회 모두 타이머 · 시연은 영상 재생 → 라이브 확인 순서. 대본 `docs/07-발표자료.md` · 예상 질문 `docs/08-qna.md`(만들 것) · 실제 PPT/PDF는 별도로.
데모 시드 재적용은 DevOps T-052(발표 10분 전 · `SPRING_PROFILES_ACTIVE=seed`).

### 기여·회고 취합 — T-053 (D6)
§3 T-053 — 각자 `worklog/<이름>/회고.md`를 자기 커밋으로 · 팀장은 `git shortlog -sn --no-merges`로 `docs/` 기여 표.

### 팀장 운영 일정 (§5 표의 운영 열과 같다)
| 일 | 운영 |
|---|---|
| D1 | T-002 리포 설정(오전) · T-003 SPEC 동결(저녁) |
| D2~D6 | 데일리 10분(아침) |
| D4 | T-040 자르기 결정(아침) · README 실행 절차 |
| D5 | T-047 EC2 클릭 점검 · T-049 기능 동결 선언(저녁) · 발표 원고 취합 |
| D6 | T-050 발표 · 리허설 2회 · T-053 기여·회고 취합 |

운영 문서 목록은 §7.

## 10. 내 티켓 전체 (최신 · `tasks/` 생성본 — 위 절과 번호가 다르면 이 표가 이긴다)

150줄 규칙으로 쪼갠 것: T-015 → T-015(User·가입·로그인) + **T-058**(refresh 회전·로그아웃)

| 날 | 티켓 | 할 일 | 선행 |
|---|---|---|---|
| D1 | [T-002](../tasks/T-002-repo-settings.md) | GitHub 리포 설정과 팀 핸들을 확정한다. | T-001 |
| D1 | [T-003](../tasks/T-003-spec-freeze.md) | D1 저녁 SPEC 동결 회의를 열고 v1을 승인한다. | T-001 |
| D1 | [T-004](../tasks/T-004-spring-skeleton.md) | Maven wrapper를 넣고 백엔드를 처음 컴파일·기동한다. | T-001 |
| D2 | [T-015](../tasks/T-015-user-register-login.md) | User 엔티티·가입·로그인(+감사 이벤트 발행). **D2 오전 우선** — BE-기능 엔티티가 User를 참조한다. | T-004 |
| D2 | [T-058](../tasks/T-058-refresh-logout.md) | refresh 회전(SHA-256 해시 저장)과 로그아웃. | T-015 |
| D3 | [T-027](../tasks/T-027-s02-lock-seed.md) | `fix(security): [S-02] 로그인 5회 잠금 · B-5 [T-027]` + SeedIngestRunner. | T-015 · 기술 리드 재현 |
| D4 | [T-037](../tasks/T-037-edge-400.md) | 400·415 경계 정리 — 500이나 봉투 아닌 응답 제거. | T-015 |
| D4 | [T-040](../tasks/T-040-scope-cut.md) | 아침 ⓪ 빈칸 세기 → 자르기 결정 · README 실행 절차. | T-033 |
| D5 | [T-044](../tasks/T-044-docs5.md) | 5번 Backend 명세 실물 발췌(인증 절). | T-058 |
| D5 | [T-047](../tasks/T-047-ec2-click.md) | EC2에서 전원 클릭 경로 1회 → 버그 티켓. | T-042 |
| D5 | [T-049](../tasks/T-049-feature-freeze.md) | 저녁 기능 동결 선언 · CI 2단계 필수 전환 요청. | T-047 |
| D6 | [T-050](../tasks/T-050-presentation.md) | 발표 35분 자료 · 리허설 2회. | T-049 |
| D6 | [T-053](../tasks/T-053-retro.md) | 기여 내역·회고 취합 — 각자 자기 파일은 자기 커밋. | T-050 |

매일 규칙: `onboarding/README.md` · git: `onboarding/GitHub규약.md` · 화면 눈 검사: `seams/smoke.md` · 하루 끝 3줄: `worklog/<내이름>/D#.md`
