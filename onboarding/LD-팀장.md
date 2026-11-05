# 레인 명세 — 팀장 (BE-인증 레인 + 팀 운영)

> 이 레인은 **BE-인증 구현 + 팀 운영**이다. 운영 업무(§9)는 하루 1~2시간 — BE 티켓(특히 D2 T-015)이 다른 레인을 막으므로 그날은 운영을 오전 데일리 10분으로 줄인다.
> 정본은 `SPEC.md`(§1 인증·로그인 보호 행 · §2 User · §4.1 · §4.4). 이 문서는 SPEC을 **구현 단위로 푼 것**이다 — 다르면 SPEC이 이긴다.
> 판정 테스트(`backend/src/test/java/com/jobgap/acceptance/`)는 기술 리드 파일 — 고치지 않는다. 틀려 보이면 SPEC 문장과 대조한 뒤 기술 리드에게.

## 0. 판정 테스트 표

| 테스트 | 줄 | 요약 | 티켓 | D1 상태 |
|---|---|---|---|---|
| `AuthAcceptanceTest` | ① `register` | 가입 201 · 비밀번호 BCrypt(`$2…`) · 같은 이메일 409 `DUPLICATE_EMAIL` · 형식 오류 400 `fields[]` | T-015 | red |
| | ② `login_storesOnlyHash` | access의 subject = uuid · `users.refresh_token_hash` = `JwtProvider.sha256(refresh)` | T-015 | red |
| | ③ `refresh_rotates` | 새 refresh ≠ 이전 · 이전 값으로 다시 → 401 `INVALID_REFRESH_TOKEN` | T-015 | red |
| | ④ `logout_invalidatesRefresh` | 로그아웃 200 → 그 refresh로 refresh → 401 | T-015 | red |
| | ⑤ `bruteForce_locks` | [S-02] 존재 계정 5회 401 → 6번째는 **맞는 비밀번호여도** 423 · `locked_until` not null | T-027 | red |
| | (지킴) `unknownEmail_neverLocks` | 없는 이메일은 6번 틀려도 전부 401 `INVALID_CREDENTIALS` | T-027 | red |
| `JobgapApplicationTests` | `contextLoads` | 컨텍스트 + Flyway 적용 (CI 1단계 필수) | T-004 | 컴파일 후 green 목표 |
| `SecurityAcceptanceTest` | (기술 리드) | 내가 깨지 않게만 — 401·403 봉투 | — | — |

확인: `cd backend && ./mvnw test -Dtest=AuthAcceptanceTest` (DB: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d database`).

## 1. 완료 정의 (D5 저녁 동결 시점)

- [ ] `AuthAcceptanceTest` 6개 전부 green
- [ ] 가입 → 로그인 → 15분 뒤 `TOKEN_EXPIRED` → refresh 1회 → 재요청 성공 (프론트와 E2E 1회)
- [ ] Burp Intruder 10회 → 6번째부터 423 + 해제 시각(S-02 재확인 캡처는 기술 리드가 `security/evidence/S-02/`에)
- [ ] 감사 로그: `LOGIN_SUCCESS`·`LOGIN_FAILURE`·`LOCK` 줄이 이메일 마스킹(`k***@e.com`)으로 찍힌다
- [ ] `SPRING_PROFILES_ACTIVE=seed`로 기동하면 시드 문서 4건이 AI에 적재된다(SeedIngestRunner)
- [ ] `docs/5-Backend개발명세서.md` 내 절 FILL 0 · 커밋 메시지 90% 이상 `type(범위): 요약 [T-###]`

## 2. 만들/고칠 파일 (패키지 `com.jobgap`)

| 경로 (`backend/src/main/java/com/jobgap/…`) | 역할 | 티켓 | 상태 |
|---|---|---|---|
| `../../../../pom.xml` · `mvnw` · `.mvn/` | 빌드 (start.spring.io에서 mvnw만 가져옴) | T-004 | pom 있음 · mvnw 만들 것 |
| `resources/application.yml` | 공유 — **내 블록은 `app.jwt`·`app.login`만**(나머지는 BE-기능·기술 리드) | T-004 | 있음 |
| `user/User.java` | 엔티티 (§3 표) | T-015 | **만들 것** |
| `user/UserRepository.java` | `findByEmail` · `findByUuid` · `findByRefreshTokenHash` · `existsByEmail` | T-015 | **만들 것** |
| `auth/AuthService.java` | register · login · refresh · logout · 잠금 | T-015 · T-027 | 골격 있음 |
| `auth/AuthController.java` · `auth/AuthDtos.java` | 계약(시그니처 고정) | — | 있음 — 바꾸려면 SPEC PR |
| `seed/SeedIngestRunner.java` | 프로파일 seed: 전 문서 delete→ingest | T-027 | 골격 있음 |
| `backend/src/test/java/com/jobgap/auth/` | 내 단위 테스트(선택) | T-015 · T-027 · T-037 | 만들 것 |

쓰기만 하는 남의 파일: `security/JwtProvider`(createAccessToken · newRefreshToken · refreshTokenExpirationMs · sha256) ·
`security/AuditLog.locked` · `security/PiiMasker.maskEmail` · `common/BusinessException`·`ErrorCode` · `PasswordEncoder` 빈(SecurityConfig).

## 3. 티켓별 구현 명세

### T-004 Spring 골격 (D1 · 선행 없음)
1. start.spring.io: Maven · Java 17 · Boot 3.3.x · group `com.jobgap` → zip에서 `mvnw`·`mvnw.cmd`·`.mvn/`만 리포 `backend/`에 둔다(pom은 리포 것 유지).
2. `.env`의 `DB_PASSWORD=jobgap`(또는 `TEST_DB_PASSWORD`) — 테스트 기본값 `jobgap/jobgap`(src/test/resources/application-test.yml).
3. `./mvnw test -Dtest=JobgapApplicationTests` green. 컴파일 에러는 **출력 전체**를 기술 리드에게(골격은 컴파일 검증 전).
- 커밋: `chore(be): Spring 골격·Maven wrapper [T-004]`

### T-015 가입·로그인·refresh·로그아웃 (D2 · 선행 T-004)
**User 엔티티 ↔ V1 `users`** (전 필드 `@Column(name=…, nullable=…)` · snake_case · `@Table(name = "users")`)

| 필드 | 타입 | 컬럼 | 비고 |
|---|---|---|---|
| id | Long | id BIGINT AI | `@Id @GeneratedValue(strategy = IDENTITY)` |
| uuid | String | uuid CHAR(36) | `columnDefinition = "CHAR(36)"` · 가입 시 `UUID.randomUUID().toString()` |
| email | String | email VARCHAR(100) | unique |
| passwordHash | String | password_hash VARCHAR(100) | BCrypt |
| name | String | name VARCHAR(20) | |
| role | String | role VARCHAR(10) | "USER" (ADMIN은 시드·수동만) |
| failedLoginCount | int | failed_login_count INT | |
| lockedUntil | OffsetDateTime | locked_until DATETIME(6) NULL | |
| refreshTokenHash | String | refresh_token_hash CHAR(64) NULL | `columnDefinition = "CHAR(64)"` |
| refreshExpiresAt | OffsetDateTime | refresh_expires_at DATETIME(6) NULL | |
| createdAt | OffsetDateTime | created_at DATETIME(6) | `@PrePersist`에서 `OffsetDateTime.now()` |

- 엔티티 메서드로 상태를 바꾼다(서비스에서 setter 남발 금지): `rotateRefresh(String hash, OffsetDateTime exp)` · `clearRefresh()` ·
  `recordFailure(int max, Duration lock)` · `recordSuccess()` · `isLocked(OffsetDateTime now)`.
- 시그니처(골격 그대로): `UserResponse register(RegisterRequest)` · `LoginResponse login(LoginRequest)` · `TokenResponse refresh(String)` · `void logout(String userUuid)`.
- 트랜잭션: `register`·`refresh`·`logout` = `@Transactional` · `login` = **`@Transactional(noRollbackFor = BusinessException.class)`**(T-027 잠금 카운트가 401과 함께 커밋돼야 한다).
- 규칙:
  - register: `existsByEmail` → 409 `DUPLICATE_EMAIL` (DB UNIQUE 위반도 409로 — `DataIntegrityViolationException` catch) · 201은 컨트롤러가 이미 붙인다.
  - login: 이메일 없음 → 실패 이벤트 + 401 `INVALID_CREDENTIALS`(문구 동일 · 카운트 없음). 비밀번호 비교는 `passwordEncoder.matches`.
  - refresh: `findByRefreshTokenHash(JwtProvider.sha256(token))` → 없음·만료 → 401 `INVALID_REFRESH_TOKEN` → 새 access + 새 refresh, **해시 교체**.
  - logout: `findByUuid(me.uuid())` → `clearRefresh()`.
- 감사 이벤트(로그인 성공·실패 — SecurityAuditListener가 로그):
```java
private final ApplicationEventPublisher events;
private void audit(String email, boolean ok) {
    if (ok) events.publishEvent(new AuthenticationSuccessEvent(
            UsernamePasswordAuthenticationToken.authenticated(email, null, List.of())));
    else events.publishEvent(new AuthenticationFailureBadCredentialsEvent(
            UsernamePasswordAuthenticationToken.unauthenticated(email, null), new BadCredentialsException("bad credentials")));
}
```
- 토큰 발급 조각:
```java
String access = jwtProvider.createAccessToken(user.getUuid(), user.getRole());
String refresh = jwtProvider.newRefreshToken();
user.rotateRefresh(JwtProvider.sha256(refresh), OffsetDateTime.now().plus(Duration.ofMillis(jwtProvider.refreshTokenExpirationMs())));
return new LoginResponse(access, refresh, new UserResponse(user.getUuid(), user.getEmail(), user.getName()));
```
- green: ①②③④ · 확인 `./mvnw test -Dtest=AuthAcceptanceTest` · `node seams/check-api.mjs http://localhost:8080`(인증·refresh 회전 행)
- 커밋: `feat(auth): User 엔티티·가입·로그인·refresh 회전·로그아웃 [T-015]`

### T-027 [S-02] 로그인 잠금 + SeedIngestRunner (D3 · 선행 T-015 · 기술 리드 재현 뒤)
- **방어만 담은 커밋** — 기술 리드가 T-015 상태(잠금 없음)에서 Burp로 재현한 뒤 머지(조치 전 이력이 남아야 점검서가 선다).
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
  - 값은 `application.yml` `app.login.max-failures`·`app.login.lock-minutes`(`@Value`) — SPEC §1 로그인 보호 행.
  - `noRollbackFor` 없으면 카운트가 롤백돼 ⑤가 영원히 401 — **가장 흔한 실패**.
- SeedIngestRunner(프로파일 `seed`): `@Transactional(readOnly = true)` 안에서 `documentRepository.findAll()` → 문서마다
  `aiClient.deleteDocument(id, ownerUuid)` → `aiClient.ingest(id, ownerUuid, docType.name(), title, content)` · 실패는 `log.warn`만(기동 계속).
  `DocumentRepository`·`AiClient`는 BE-기능 파일 — **호출만**(수정 허용 밖).
- green: ⑤ · (지킴) · 확인 `./mvnw test -Dtest=AuthAcceptanceTest` · `SPRING_PROFILES_ACTIVE=seed ./mvnw spring-boot:run` 후 시드 문서로 분석 스트림에 sources
- 커밋 둘: `fix(security): [S-02] 로그인 5회 잠금 · B-5 [T-027]` / `feat(seed): 시드 문서 AI 적재 러너 [T-027]`

### T-037 400 경계 정리 (D4 · 선행 T-015)
- 확인할 입력(전부 봉투여야 한다 — 500·HTML 금지): `size=0`·`page=abc`(→ 400 · `PageRequests`·`MethodArgumentTypeMismatchException` 이미 매핑) ·
  JSON 깨진 본문(`HttpMessageNotReadableException` 이미 매핑) · 빈 파일·UTF-8 아님(BE-기능 서비스 — 안 되면 BF에 티켓) · Content-Type 누락(`HttpMediaTypeNotSupportedException` 매핑됨).
- 빠진 매핑만 `common/GlobalExceptionHandler.java`에 줄 추가(수정 허용 · 기술 리드 리뷰). 인증 테스트 보강은 `src/test/java/com/jobgap/auth/`.
- 커밋: `fix(common): 400 경계 입력 봉투 정리 [T-037]`

### T-044 5번 문서 (D5)
- `docs/5-Backend개발명세서.md`: 엔티티 규약 표(§3 표를 4엔티티로 — BF 행은 BF에게 받아 붙임) · 인증 흐름(로그인·refresh 회전·잠금 순서) · 5절은 기술 리드.
- 커밋: `docs(be): 백엔드 명세 실물 발췌 [T-044]`

## 4. 받는 것 · 주는 것

| 방향 | 누구 | 무엇 | 언제 |
|---|---|---|---|
| 받음 | 기술 리드 | `JwtProvider`·`PasswordEncoder`·감사 리스너·`common/` | D1 (T-005) |
| 받음 | BE-기능 | `DocumentRepository`·`AiClient` (SeedIngestRunner용) | D3 (T-013·T-024) |
| 줌 | BE-기능 | `User`·`UserRepository.findByUuid` — 서비스가 `AuthUser.uuid()`로 소유자를 찾는다 | **D2 오전** (BF T-013이 기다린다) |
| 줌 | FE-화면 | `/api/auth/**` 실물 — 목과 같은 모양(check-api 인증 행 green) | D2 저녁 |
| 공유 | application.yml | 내 블록 `app.jwt`·`app.login`만 · 다른 블록 수정은 그 오너 PR | 상시 |

## 5. 일정

| 날 | 할 일 |
|---|---|
| D1 11/5 목 | T-004 · `JobgapApplicationTests` green · 골든셋 데이터 돕기(T-011) |
| D2 11/6 금 | 오전 `User`·`UserRepository` 먼저 머지(BF 대기 해소) → T-015 |
| D3 11/9 월 | 기술 리드 S-02 재현 확인 → T-027 두 커밋 |
| D4 11/10 화 | T-037 · 동적 점검일에 Burp 재현 보조 |
| D5 11/11 수 | T-044 · EC2 클릭 경로 · **저녁 동결** |
| D6 11/12 목 | 버그만 · 발표 Q&A "refresh 회전·잠금" 한 줄 |

## 6. 막힐 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| 기동 "JWT_SECRET는 32바이트 이상" | `.env` 비어 있음 | `openssl rand -base64 48` |
| "Unsupported Database: MariaDB" | flyway-mysql 누락 | pom에 있음 — 지웠는지 확인 |
| validate 실패 `wrong column type … uuid` | String이 varchar로 기대 | `columnDefinition = "CHAR(36)"` / `"CHAR(64)"` |
| validate 실패 datetime | OffsetDateTime 저장 방식 | application.yml `timezone.default_storage: NORMALIZE`(있음) · 그래도면 `columnDefinition = "DATETIME(6)"` |
| ⑤가 계속 401 | 카운트가 401 예외와 함께 롤백 | `@Transactional(noRollbackFor = BusinessException.class)` |
| ⑤ 6번째가 401 | 잠금 확인을 비밀번호 비교 뒤에 함 | 순서: 잠금 → 비밀번호 |
| ② 해시 불일치 | refresh 원문 저장 또는 다른 해시 | `JwtProvider.sha256(refresh)`만 |
| logout 403 | `@PreAuthorize` authority 이름 | 필터가 `ROLE_` + role — role 값은 `USER`(접두어 없이 저장) |
| 감사 로그 안 찍힘 | 이벤트 미발행 | §3 `audit()` |
| 시드 로그인 실패 | V2 해시는 `Passw0rd!` | 대소문자 확인 |

## 7. 내가 쓰는 문서 절

| 파일 · 절 | 정본(발췌 원본) |
|---|---|
| `docs/5-Backend개발명세서.md` 엔티티 규약 · 인증 흐름 | `user/User.java` · `AuthService` · SPEC §1 인증 행 |
| `docs/9-보안점검서.md` B-4·B-5 조치 내용(기술 리드 표에 넣을 문장 제공) | T-027 커밋 diff |

## 8. 코딩 에이전트 지시서 예시 (T-027)

```
[배경] SPEC.md §1 "로그인 보호" 행 · §4.1 login · §4.4 423 행을 그대로 붙인다.
       현재 AuthService.login은 T-015 구현(잠금 없음). 판정 테스트 AuthAcceptanceTest ⑤·(지킴)이 red.
[목표] 존재하는 계정만 실패 5회 → 15분 잠금 · 6번째부터 맞는 비밀번호여도 423 ACCOUNT_LOCKED.
[수용 기준]
 - ./mvnw test -Dtest=AuthAcceptanceTest 6개 green
 - 판정 순서: 사용자 조회 → 잠금 확인 → 비밀번호 비교 → 실패 기록(5회째 locked_until=now+15m, 카운트 0) → 401
 - login에 @Transactional(noRollbackFor = BusinessException.class)
 - 잠금 시 AuditLog.locked(email)
[제약] 수정 허용: backend/src/main/java/com/jobgap/auth/ · backend/src/main/java/com/jobgap/user/ · backend/src/test/java/com/jobgap/auth/
       acceptance/ 폴더·security/·common/은 수정 금지 · 커밋하지 말 것
[확인 명령] cd backend && ./mvnw test -Dtest=AuthAcceptanceTest
```

## 9. 팀장 운영 업무 (BE-인증과 병행)

### T-002 리포 설정 (D1 오전)
1. `.github/CODEOWNERS`의 `@TEAMLEAD` 등 7개 핸들 → 실제 GitHub 아이디(SPEC §8 표의 사람과 같게).
2. GitHub Settings → Branches → `main` 규칙: Require a pull request · 승인 1 · Require review from Code Owners · 직접 푸시 금지.
3. README 팀 표 채우기 · `docs/1-프로젝트계획서.md` §1·§2 초안.
커밋: `chore(setup): 팀 핸들·보호 규칙 [T-002]`

### T-003 SPEC 동결 (D1 저녁 · 20분)
1. 전원 소집 → 기술 리드가 SPEC §2·§4·§6을 10분 낭독.
2. 질문은 그 자리에서 "SPEC을 고친다 / 그대로 간다" 둘 중 하나로 결론 — 고치면 기술 리드가 즉시 PR.
3. 팀장이 SPEC 머리에 `동결 v1 · 2026-11-05` 한 줄 PR 승인 = 동결. 이후 계약 변경은 SPEC §9 규약.

### 데일리 10분 (매일 아침 · 순서 고정)
1. (1분) BOARD 오늘 칸 띄우기 — 어제 머지 안 된 티켓만 읽는다.
2. (5분) 1인 30초: 어제 머지한 것 · 오늘 티켓 번호 · 막힌 것(있으면 "누구랑 회의 뒤에 본다"까지만).
3. (2분) 기술 리드: `node seams/check-scope.mjs --overlap <오늘 티켓들>` 결과 · 게이트 red 한 줄.
4. (2분) 팀장: 오늘 자를 것/옮길 것 결정 한 줄을 BOARD에 기록.
막힘 해결은 회의 밖에서 2인으로. 30분 넘게 막힌 사람은 채널에 올린다(역할 시트 공통 규칙).

### T-040 자르기 결정 (D4 아침)
1. 기술 리드의 `node scripts/check-rubric-p3.mjs` MISS 목록 = ⓪ 빈칸.
2. D5 저녁까지 못 닫을 칸이 있으면 스킬 P3-6 "넘치면 자르는 순서" 1→5 순서로만 자른다
   (K8s·CD → 분석 기록 화면 → 골든셋 10→5 → 캡처·테스트 축소 → Tavily 분기는 마지막까지 유지).
3. 자르지 않는 것: 스트리밍 E2E · 보안 S-ID 3건 · EC2 compose · 문서 9종 · 인증 확정값.
4. 결정을 BOARD D4 칸에 날짜와 함께 한 줄 · 제출 문서에는 "기간 대비 범위 조정"으로.

### T-049 기능 동결 선언 (D5 저녁)
채널에 "기능 동결 — 이후 PR은 `fix:`만, 새 화면·필드·엔드포인트 금지" · 기술 리드에게 CI 2단계 `continue-on-error` 제거 요청.
빈칸이 0이면 DevOps에 CD·K8s 가산 착수 허락.

### T-050 발표 35분 (D6 · 리허설 2회)

| 단계(분) | 슬라이드 | 발표자 |
|---|---|---|
| 소개 (6) | 목적·3대 목적 요약 · 팀·레인·부오너 · 아키텍처(신뢰 경계) | 팀장 · 팀장 · DevOps |
| 시연 (10) | E2E(가입→업로드→스트리밍, 영상 먼저 → 라이브) · 보안 시연 2건(IDOR·Brute Force) · 측정 수치 1장 | FE-화면·FE-분석 · 기술 리드 · AI |
| 과정 (7) | CI/CD 흐름 · 보안 점검 요약 · RAG 설계와 품질 · 도전과 해결 2건 | DevOps · 기술 리드 · AI · BE |
| 소감 (8) | 1인 1.5분 | 각자 |
| Q&A (4) | 예상 질문 | 질문 받은 레인 |

규칙: 자기 레인 슬라이드는 자기가 만들고 말한다 · 슬라이드의 숫자마다 그 숫자를 만든 명령 한 줄을 대본에 적는다(없으면 슬라이드에서 뺀다) ·
리허설 2회 모두 타이머 · 시연은 영상 재생 → 라이브 확인 순서. 대본 파일 `docs/07-발표자료.md`(만들 것) · 실제 PPT/PDF는 별도로.

### 팀장 운영 일정 (BE-인증 일정에 더한다)
| 일 | 운영 |
|---|---|
| D1 | T-002 리포 설정(오전) · T-003 SPEC 동결(저녁) |
| D2~D6 | 데일리 10분(아침) |
| D4 | T-040 자르기 결정(아침) |
| D5 | T-049 기능 동결 선언(저녁) · 발표 원고 취합 |
| D6 | T-050 발표 · 리허설 2회 · 기여·회고 취합 |

### 팀장 운영 문서
| 문서 | 정본 |
|---|---|
| `docs/1-프로젝트계획서.md` 전부 | SPEC §0 · §8 · BOARD |
| `README.md` 팀 표 · 실행 절차(DevOps와 함께) | compose · `.env.example` |
| 발표 대본 `docs/07-발표자료.md` · `docs/08-qna.md` (만들 것) | 위 T-050 표 · 각 레인 원고 |

## 10. 내 티켓 전체 (최신 · `tasks/` 생성본 — 위 절과 번호가 다르면 이 표가 이긴다)

150줄 규칙으로 쪼갠 것: T-015 → T-015(User·가입·로그인) + **T-058**(refresh 회전·로그아웃)

| 날 | 티켓 | 할 일 | 선행 |
|---|---|---|---|
| D1 | [T-002](../tasks/T-002-repo-settings.md) | GitHub 리포 설정과 팀 핸들을 확정한다 | T-001 |
| D1 | [T-003](../tasks/T-003-spec-freeze.md) | D1 저녁 SPEC 동결 회의를 열고 v1을 승인한다 | T-001 |
| D1 | [T-004](../tasks/T-004-spring-skeleton.md) | Maven wrapper를 넣고 백엔드를 처음 컴파일·기동한다 | T-001 |
| D2 | [T-015](../tasks/T-015-user-register-login.md) | User 엔티티·가입·로그인(+감사 이벤트 발행). **D2 오전 우선** | T-004 |
| D2 | [T-058](../tasks/T-058-refresh-logout.md) | refresh 회전(SHA-256 해시 저장)과 로그아웃 | T-015 |
| D3 | [T-027](../tasks/T-027-s02-lock-seed.md) | `fix(security): [S-02] 로그인 5회 잠금 · B-5 [T-027]` + SeedIngestRunner | T-015 · 기술 리드 재현 |
| D4 | [T-037](../tasks/T-037-edge-400.md) | 400·415 경계 정리 | T-015 |
| D4 | [T-040](../tasks/T-040-scope-cut.md) | 아침 ⓪ 빈칸 세기 → 자르기 결정 · README 실행 절차 | T-033 |
| D5 | [T-044](../tasks/T-044-docs5.md) | 5번 Backend 명세 실물 발췌(인증 절) | T-058 |
| D5 | [T-047](../tasks/T-047-ec2-click.md) | EC2에서 전원 클릭 경로 1회 → 버그 티켓 | T-042 |
| D5 | [T-049](../tasks/T-049-feature-freeze.md) | 저녁 기능 동결 선언 · CI 2단계 필수 전환 요청 | T-047 |
| D6 | [T-050](../tasks/T-050-presentation.md) | 발표 35분 자료 · 리허설 2회 | T-049 |
| D6 | [T-053](../tasks/T-053-retro.md) | 기여 내역·회고 취합 | T-050 |

매일 규칙: `onboarding/README.md` · git: `onboarding/GitHub규약.md` · 화면 눈 검사: `seams/smoke.md` · 하루 끝 3줄: `worklog/<내이름>/D#.md`
