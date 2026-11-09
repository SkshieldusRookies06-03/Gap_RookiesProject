# Backend 개발 명세서

> 정본 기준 · 기준 커밋: (확정 시 기입) · v0.1 — 2026-11-05 · 문서 오너: 팀장(BE-인증 레인) · 5절은 기술 리드
> 정본: `backend/` 코드 · `application.yml` · Flyway `V1__schema.sql` · `SPEC.md`. **"구현 예정 T-0xx"** 표시는 D1 골격 시점에 아직 없는 클래스 — 구현되면 표시를 지운다.

## 1. 기술 스택

- **Framework**: Spring Boot 4.1.2 (WebMVC · Security · Data JPA · Validation · Actuator · WebFlux(WebClient)) · Flyway(`spring-boot-starter-flyway` + `flyway-mysql`) · jjwt 0.12.6 · Jackson 3(`tools.jackson.*` · 애너테이션만 `com.fasterxml.jackson.annotation`)
- **언어**: Java 17
- **데이터베이스**: MariaDB 10.11 (`mariadb-java-client`) · `ddl-auto: validate` + Flyway 마이그레이션
- **빌드**: Maven — 로컬 `./mvnw`(wrapper · T-004에서 커밋), CI는 러너의 `mvn`, Docker 빌드 이미지 `maven:3.9.9-eclipse-temurin-17`

## 2. 프로젝트 구조

```
backend/src/main/java/com/jobgap/
├── JobgapApplication.java   진입점 (@ConfigurationPropertiesScan)
├── common/     응답 봉투(ApiResponse·PageResponse) · ErrorCode · BusinessException · GlobalExceptionHandler · PageRequests
├── security/   SecurityConfig · JwtProvider · JwtAuthenticationFilter · 401/403 핸들러 · SecurityAuditListener · AuditLog · PiiMasker · AuthUser
├── auth/       AuthController · AuthService · AuthDtos            (회원가입·로그인·refresh·로그아웃)
├── user/       User · UserRepository                               (구현 예정 T-015)
├── document/   DocumentController · DocumentService · DocumentDtos · DocumentType · Document·DocumentRepository(구현 예정 T-013)
├── analysis/   AnalysisController · AnalysisService · AnalysisDtos · Analysis·AnalysisMessage·리포지토리 둘(구현 예정 T-013)
├── ai/         AiClient(RestClient·WebClient) · AiProperties    (AI 내부 API 호출 한 곳)
└── seed/       SeedIngestRunner (프로파일 seed — 시드 문서를 AI에 적재)
backend/src/main/resources/
├── application.yml
└── db/migration/  V1__schema.sql(테이블 4) · V2__seed.sql(사용자 2 · 문서 4 · 분석 1)
```

## 3. 주요 설정

`application.yml` 발췌 — 비밀은 전부 `${…}` 환경변수(값은 `.env`, 커밋하지 않는다 · I-1).
```yaml
spring:
  datasource: { url: ${DB_URL:…}, username: ${DB_USER:jobgap}, password: ${DB_PASSWORD:} }
  jpa:
    hibernate.ddl-auto: validate          # 스키마는 Flyway만 바꾼다
    open-in-view: false
    properties.hibernate.jdbc.time_zone: Asia/Seoul
    properties.hibernate.timezone.default_storage: NORMALIZE
  flyway: { enabled: true, locations: classpath:db/migration }
  jackson.time-zone: Asia/Seoul           # 응답 시각 +09:00
  servlet.multipart: { max-file-size: 200KB, max-request-size: 1MB }   # nginx client_max_body_size 1m
  mvc.async.request-timeout: 300s         # SSE — WebClient 290s < 300s < nginx 310s
server:
  forward-headers-strategy: native        # nginx X-Forwarded-* → 실제 IP·스킴
  error: { include-stacktrace: never, include-message: never }
management.endpoints.web.exposure.include: ${ACTUATOR_EXPOSURE:health,info}
app:
  jwt: { secret: ${JWT_SECRET:}, access-token-expiration: 900000, refresh-token-expiration: 1209600000 }
  cors.allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}
  ai: { base-url: ${AI_BASE_URL:…}, internal-token: ${AI_INTERNAL_TOKEN:}, connect-timeout-ms: 3000, read-timeout-ms: 30000, stream-timeout-seconds: 290, history-size: 6 }
```
`JWT_SECRET`이 32바이트 미만이면 `JwtProvider`가 기동을 거부한다(의도) · compose는 `${JWT_SECRET:?…}`로 빈 값을 막는다.

## 4. 주요 클래스

### 4.1 Entity

| 엔티티 | 테이블 | 상태 |
|---|---|---|
| `User` | `users` — uuid CHAR(36) · email · password_hash(BCrypt) · role · failed_login_count · locked_until · refresh_token_hash CHAR(64) · refresh_expires_at | 구현 예정 T-015 |
| `Document` | `documents` — owner_id · doc_type · title · content(마스킹본, MEDIUMTEXT) · char_count · masked_count | 구현 예정 T-013 |
| `Analysis` | `analyses` — owner_id · posting_id · resume_id · title | 구현 예정 T-013 |
| `AnalysisMessage` | `analysis_messages` — analysis_id · role · content(MEDIUMTEXT) · sources(TEXT · JSON) | 구현 예정 T-013 |

리프레시 토큰 테이블은 두지 않는다 — `users` 컬럼(ADR-02 · 사용자당 로그인 1곳).

#### 4.1.1 엔티티 규약·연관관계

공통: `@Table(name)` · 전 필드 `@Column(name, nullable, length)` · 이름 snake_case · 날짜 `OffsetDateTime` · uuid는 `String`+`CHAR(36)` · enum은 `@Enumerated(STRING)` + `columnDefinition = "VARCHAR(20)"` · 본문 `columnDefinition = "MEDIUMTEXT"` · sources `"TEXT"`.

| 엔티티 | @Table | 관계 | 방향과 이유 | Fetch | Cascade |
|---|---|---|---|---|---|
| Document | `documents` | N:1 User(owner) | 단방향 — 사용자에서 문서 컬렉션을 읽는 화면이 없다(목록은 페이징 쿼리) | LAZY | 없음 |
| Analysis | `analyses` | N:1 User(owner) · N:1 Document(posting) · N:1 Document(resume) · 1:N AnalysisMessage | messages만 **양방향** — 대화 화면이 메시지를 순서대로 읽고, 분석과 생명주기가 같다 | to-one LAZY | `messages`: ALL + orphanRemoval |
| AnalysisMessage | `analysis_messages` | N:1 Analysis | 양방향의 소유 측(`analysis_id` FK) | LAZY | 없음 |
| User | `users` | (없음) | 다른 엔티티가 단방향으로 참조 | — | — |

DB FK는 전부 RESTRICT(DB cascade 안 씀) — 문서 삭제 순서는 서비스 코드가 보이게 처리한다(§4.5 · 4번 §4.5).

### 4.2 Controller

| 컨트롤러 | 경로 접두어 | 권한 |
|---|---|---|
| `AuthController` | `/api/auth` | register·login·refresh 공개 · logout `@PreAuthorize("hasAnyAuthority('ROLE_USER','ROLE_ADMIN')")` |
| `DocumentController` | `/api/documents` | 클래스 `@PreAuthorize("hasAnyAuthority('ROLE_USER','ROLE_ADMIN')")` · `@Validated` |
| `AnalysisController` | `/api/analyses` | 클래스 `@PreAuthorize("hasAnyAuthority('ROLE_USER','ROLE_ADMIN')")` · 스트림 `produces = text/event-stream` |

컨트롤러는 `@AuthenticationPrincipal AuthUser me`(JWT에서 꺼낸 uuid)만 쓴다 — 프론트가 보낸 사용자 id는 받지 않는다(B-2). 응답은 DTO만(엔티티 반환 금지).

### 4.3 Service

| 서비스 | 메서드 | 목적 · 소유자 검증 위치 |
|---|---|---|
| `AuthService` | register · login · refresh · logout | 가입(BCrypt) · 로그인(잠금 판정 → 비밀번호 → 토큰 발급 · 감사 이벤트) · refresh 회전 · 해시 삭제 — 구현 예정 T-015·T-027 |
| `DocumentService` | list · get · upload · updateTitle · delete | **get·updateTitle·delete 첫 줄에서 소유 검증 → 403**(T-026 `fix(security): [S-01]`) · 업로드 마스킹(T-028) · 삭제 순서 — 구현 예정 T-014·T-024 |
| `AnalysisService` | stream · list · messages | 스트림 시작 전 소유·존재·종류 검증 → AI 중계 · done 가로채 저장 · messages 소유 검증 — 구현 예정 T-025·T-026 |
| `AiClient` | ingest · deleteDocument · analyze | AI 내부 API 호출(§6) — 구현 예정 T-024·T-025 |

### 4.4 Repository

계획된 쿼리(BE-기능 명세 · 구현 예정 T-013):
```java
// 메서드 이름 쿼리
Page<Document> findByOwnerIdAndDocType(Long ownerId, DocumentType docType, Pageable pageable);
Page<AnalysisMessage> findByAnalysisIdOrderByIdAsc(Long analysisId, Pageable pageable);

// @Query — 파라미터 바인딩(:docId) · 문자열 이어붙이기 없음(B-1)
@Query("select a from Analysis a where a.posting.id = :docId or a.resume.id = :docId")
List<Analysis> findAllUsing(@Param("docId") Long docId);
```
`UserRepository`: `findByEmail` · `findByUuid` · `findByRefreshTokenHash` · `existsByEmail` (구현 예정 T-015).

### 4.5 트랜잭션 경계

`@Transactional`은 서비스에만 붙인다(컨트롤러·리포지토리 금지).

| 메서드 | 트랜잭션 | 이유 |
|---|---|---|
| `DocumentService.list` · `get` · `AnalysisService.list` · `messages` | `readOnly = true` | 조회 전용 |
| `DocumentService.updateTitle` · `AuthService.register` · `refresh` · `logout` | 쓰기 | 한 번에 커밋 |
| `AuthService.login` | 쓰기 · `noRollbackFor = BusinessException.class` | 실패 카운트는 401을 던져도 커밋돼야 잠금이 동작한다 |
| `DocumentService.upload` | 저장만 짧은 트랜잭션 → **트랜잭션 밖에서** AI 적재 → 실패 시 삭제 트랜잭션 | 임베딩 호출(최대 30s) 동안 DB 커넥션을 잡지 않는다 |
| `DocumentService.delete` | AI 삭제(밖) → 분석·문서 삭제(쓰기) | AI 실패면 DB를 건드리지 않는다 |
| `AnalysisService.stream` | 질문 저장(짧게) → **스트림은 트랜잭션 밖** → done 때 답변 저장(새 짧은 트랜잭션) | 스트림 수십 초 동안 커넥션을 잡지 않는다 · 중단·에러면 답변을 남기지 않는다 |

## 5. 보안 구현

### 5.1 인증/인가

`SecurityConfig` 필터 체인(위가 먼저 일치):
1. `dispatcherTypeMatchers(ASYNC, ERROR).permitAll()` — SSE 비동기 재진입에 인가를 다시 걸지 않는다
2. `/actuator/health` permitAll — HEALTHCHECK(아래 ADMIN 규칙보다 위)
3. `/actuator/**` `hasRole("ADMIN")`
4. `POST /api/auth/register·login·refresh` permitAll
5. 그 밖 `authenticated()` · 세션 STATELESS · formLogin·httpBasic 끔

토큰:
- 발급: `JwtProvider.createAccessToken(uuid, role)` — subject = uuid · claim role · HS256 명시 · 15분
- 검증: `JwtAuthenticationFilter`가 `Bearer` → `JwtProvider.parse()` → 만료면 `TOKEN_EXPIRED`, 서명·형식 오류면 `UNAUTHORIZED`(EntryPoint가 봉투로) · 필터는 보안 체인 안에서만 돈다(서블릿 자동 등록 해제)
- Refresh: `JwtProvider.newRefreshToken()`(랜덤 32바이트) → DB에는 `JwtProvider.sha256()`만 · 재발급 시 교체 · 로그아웃 시 삭제
- 역할 + 소유: 컨트롤러 `@PreAuthorize("hasAnyAuthority('ROLE_USER','ROLE_ADMIN')")` + 서비스에서 본인 소유만 허용(ADMIN 예외 없음) — 실패 시 `AuditLog.forbidden(…)` 후 403

### 5.2 공격 방어

| 위협 | 방어 방식 | 구현 위치 |
|------|-----------|-----------|
| SQL Injection | JPA 메서드 쿼리 · `@Query` 파라미터 바인딩만 · 정렬은 허용 목록 | 리포지토리(§4.4) · `common/PageRequests.documentSort()` |
| Brute Force | 존재하는 계정 5회 실패 → 15분 잠금(423) · 실패 카운트 커밋 | `AuthService.login`(구현 예정 T-027 · S-02) · `users.locked_until` |
| CSRF | 비활성 — 인증 정보는 쿠키가 아니라 Authorization 헤더로만 전달된다. 브라우저가 교차 사이트 요청에 이 헤더를 자동으로 붙이지 않으므로 CSRF 공격 전제가 성립하지 않는다. 상태 변경은 GET으로 노출하지 않는다(GET = 조회 전용). | `SecurityConfig.filterChain` `csrf.disable()` |
| XSS | API 응답 CSP `default-src 'none'; frame-ancestors 'none'` · 프론트는 텍스트 렌더 · HTML은 nginx CSP | `SecurityConfig` headers · `nginx/default.conf` |
| 입력값 검증 | DTO `@Valid` · `@NotBlank`·`@Size`·`@Pattern`(이메일·id 숫자) · 업로드 확장자·MIME·크기·UTF-8 | `AuthDtos` · `DocumentDtos` · `AnalysisDtos` · `DocumentService.upload`(T-024) |
| IDOR | 서비스 첫 줄 소유 검증 → 403 | `DocumentService`·`AnalysisService`(T-026 · S-01) |
| 민감정보 유출(LLM) | 업로드 본문·제목·질문을 저장·AI 전송 전 마스킹 | `security/PiiMasker.maskAndTrim`(T-028 · S-03) |

### 5.3 설정·로그

- CORS: 운영은 nginx 같은 출처라 불필요 — 로컬 dev Origin만 `CORS_ALLOWED_ORIGINS`(`*` 금지) · `SecurityConfig.corsConfigurationSource`
- Actuator: 노출 `health,info` · `/actuator/**` ADMIN(health만 공개)
- 감사 로그(로거 `AUDIT`): 로그인 성공·실패(`SecurityAuditListener`) · 401(`RestAuthenticationEntryPoint` — IP·URI) · 403(`RestAccessDeniedHandler` · `AuditLog.forbidden`) · 잠금(`AuditLog.locked`). 이메일은 `PiiMasker.maskEmail`로 가린다 — 예: `LOGIN_FAILURE account=k***@e.com reason=BadCredentialsException`. 토큰·비밀번호·질문 본문은 로그에 남기지 않는다.
- 500: `GlobalExceptionHandler.unknown`이 스택을 서버 로그에만 남기고 응답은 `INTERNAL_SERVER_ERROR` 일반 메시지
- 감사 로그 실제 캡처(로그인 성공·실패·401·403 4줄): [`security/evidence/B-9-audit.txt`](../security/evidence/B-9-audit.txt)

## 6. AI 모듈 연동

| 항목 | 값 |
|---|---|
| 대상 | `${AI_BASE_URL}` (compose: `http://ai-service:8000` · `app` 망) |
| 내부 토큰 | 모든 호출에 `X-Internal-Token: ${AI_INTERNAL_TOKEN}` — `AiClient`가 기본 헤더로 주입 |
| 단건(ingest·delete) | `RestClient` · connect 3,000ms · read 30,000ms · 실패 → `BusinessException(AI_UNAVAILABLE)` = 503 |
| 스트림(analyze) | `WebClient` `bodyToFlux(ServerSentEvent<String>)` · 전체 상한 `Flux.timeout(290s)`(`responseTimeout`은 읽기 사이 유휴 시간이라 상한이 아니다 · SPEC §1) · done·error 없이 EOF면 `event: error` · `onErrorResume` → `event: error`(AI_UNAVAILABLE 봉투) |
| 소유자 | `ownerUuid`는 `AuthUser.uuid()`에서만 — 프론트 값을 쓰지 않는다(A-3) |
| 문맥 | 후속 질문은 이전 메시지 최근 6개를 `history`로(이번 질문 제외) |

중계 규칙: AI의 `token`·`sources`·`error`는 그대로 흘리고, AI의 `done`은 가로채 답변 저장 후 `done{messageId}`를 보낸다(4번 §5.1). 계약 상세는 7번 §4.
<!-- TODO(D3·BE-기능): AiClient 생성자(타임아웃 설정) 코드 발췌로 교체 -->

## 7. 파일 처리

- 허용: `.md`·`.txt`(확장자 판정) · MIME `text/markdown`·`text/x-markdown`·`text/plain`·`application/octet-stream`·빈 값 · UTF-8 엄격 디코딩 실패 415 · 빈 파일 400 · **200KB 초과 413**(서비스가 `file.getSize()`로 직접 검사 — multipart 설정은 2차 방어선)
- 원본 파일·파일명은 저장하지 않는다 — 디코딩한 텍스트를 `PiiMasker.mask()`로 가린 본문만 `documents.content`에 저장(저장 볼륨 없음 · 파일명 재생성 불필요)
- 적재: 저장 커밋 후 `AiClient.ingest(documentId, ownerUuid, docType, title, text)` → 실패하면 행 삭제 + 503

## 8. 예외 처리

`GlobalExceptionHandler`(`@RestControllerAdvice` 한 곳) — 응답은 항상 `application/json` 봉투.

| 예외 | 상태 · code |
|---|---|
| `BusinessException(ErrorCode)` | ErrorCode의 상태 · 이름 그대로(4번 §6 표) |
| `MethodArgumentNotValidException` | 400 `VALIDATION_ERROR` + `fields[]` |
| `ConstraintViolationException` · `HandlerMethodValidationException` · `MethodArgumentTypeMismatchException`(type·id 형식) · `MissingServletRequestParameterException`·`…PartException` · `HttpMessageNotReadableException`(JSON 오류) · `HttpMediaTypeNotSupportedException` · `MultipartException` | 400 `VALIDATION_ERROR` |
| `MaxUploadSizeExceededException` | 413 `FILE_TOO_LARGE` |
| `AccessDeniedException`(@PreAuthorize) | 403 `FORBIDDEN` |
| `NoResourceFoundException` · `HttpRequestMethodNotSupportedException` | 404 `NOT_FOUND` |
| `AsyncRequestNotUsableException` · `AsyncRequestTimeoutException` | 응답 없이 종료(스트림 클라이언트가 끊음) |
| 그 밖 `Exception` | 500 `INTERNAL_SERVER_ERROR`(스택은 로그에만) |

필터 단계(컨트롤러 밖)의 401·403도 `SecurityResponses`가 같은 봉투로 쓴다.

## 9. 빌드 및 배포

```bash
./mvnw test                                   # 판정 테스트(실 MariaDB — dev compose의 database)
./mvnw -DskipTests package                    # target/*.jar
./mvnw org.cyclonedx:cyclonedx-maven-plugin:makeAggregateBom && cp target/bom.json ../security/evidence/bom.json   # SBOM(B-13)
```
Dockerfile(`backend/Dockerfile`): 빌드 `maven:3.9.9-eclipse-temurin-17` → 실행 `eclipse-temurin:17-jre-jammy` · 비root(uid 1001) · `TZ=Asia/Seoul` · HEALTHCHECK `curl -fsS http://localhost:8080/actuator/health`.
<!-- TODO(D4·기술 리드): SBOM 결과 요약(구성요소 수 · High 이상 CVE 건수) — 상세는 9번 점검서 -->
