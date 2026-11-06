# 레인 명세 — BE-기능

> 정본은 `SPEC.md`(§1 업로드·AI 호출·SSE 행 · §2 · §4.2 · §4.3 · §6 · §7 S-01). 이 문서는 SPEC을 **구현 단위로 푼 것**이다 — 다르면 SPEC이 이긴다.
> 범위(무엇을 고쳐도 되나)·수용 기준·확인 명령은 `tasks/T-###-*.md` 티켓 파일이 정본이다.
> 팀에서 가장 어려운 사슬(AI 스트림 → Spring 중계 → 화면)의 가운데다. 판정 테스트(`acceptance/`)는 고치지 않는다.

**내 브랜치·흐름** — 내 브랜치 `feature/backend`(팀장·BE-인증과 같이 쓴다 · 티켓마다 새 브랜치를 만들지 않는다) · 작업 전 `git pull origin feature/backend`
· push 전 `node seams/check-scope.mjs <내 티켓> origin/feature/backend` 무출력(티켓 둘이면 `T-014,T-024`) · push 전 `git diff --stat origin/feature/backend...HEAD`로 본 코드 150줄 이하 확인
· PR `feature/backend → dev` → 통합 확인 후 `dev → main` · 필수 리뷰·승인·CODEOWNERS 없음(리뷰는 선택 — `onboarding/GitHub규약.md` §1·§3 · SPEC §1 커밋·브랜치 행 · §9).

## 0. 판정 테스트 표

| 테스트 | 줄 | 요약 | 티켓 | D1 |
|---|---|---|---|---|
| `DocumentAcceptanceTest` (7) | ① `list` | 내 것만 · id 문자열 · 목록에 content 없음 · page 7필드 · type 필터 · sort 허용 밖/page -1/type 밖 400 | T-014 | red |
| | ② `detail_ownership` | [S-01] 내 것 200(content·maskedCount) · 남의 GET/PUT/DELETE 403 `FORBIDDEN` · 없는 id 404 `DOCUMENT_NOT_FOUND` | T-014 → **T-026** | red |
| | ③ `upload_masksAndIngests` | 201 · ingest 본문에 내 uuid·`"docType":"RESUME"` · AI·DB에 원문 연락처 없음 · `masked_count`=2 | T-024 + **T-028(기술 리드)** | red |
| | ④ `upload_rejects` | .exe 415 · 빈 파일 400 · 300KB 413 · 같은 제목 409 · EUC-KR 415 (전부 봉투) | T-024 | red |
| | ⑤ `upload_aiDown` | AI 다운 → 503 `AI_UNAVAILABLE` · 행이 남지 않음 | T-024 | red |
| | ⑥ `updateTitle` | 200 · 빈 제목 400 · 다른 내 문서와 같은 제목 409 | T-014 | red |
| | ⑦ `delete_order` | AI 다운이면 503·문서 그대로 → 정상이면 AI DELETE(`ownerUuid=` 내 uuid) · 그 문서를 쓴 분석 삭제 · 문서 삭제 | T-055 | red |
| `AnalysisAcceptanceTest` (6) | ① `newAnalysis_relaysAndSaves` | analysis → token(JSON 문자열 그대로) → sources → done{messageId} · USER·ASSISTANT 저장(토큰 디코드 연결) · AI 요청에 uuid·REPORT·postingId | T-025 | red |
| | ② `validation_beforeStream` | (Accept: text/event-stream) 남의 문서 403 · 종류 뒤바뀜 400 `DOCUMENT_TYPE_MISMATCH` · 후속 빈 질문 400 · 없는 분석 404 `ANALYSIS_NOT_FOUND` · AI 미호출 | T-025 + **T-026**(403) | red |
| | ③ `followUp` | FOLLOWUP · question 그대로 · history 2개(이번 질문 제외) · analysis 이벤트 없음 | T-025 | red |
| | ④ `aiError_notSaved` | AI가 error → 그대로 흘림 · ASSISTANT 저장 안 함 | T-025 | red |
| | ⑤ `aiDown_isEventError` | AI 연결 실패 → 200 유지 · 마지막 `event: error` `AI_UNAVAILABLE` | T-025 | red |
| | ⑥ `listAndMessages` | lastStatus DONE/INCOMPLETE 파생 · postingTitle · messages page/size(totalElements·sources 배열) · 남의 분석 403(양방향) | T-056 + **T-026**(403) | red |
| `BoundaryAcceptanceTest` 중 내 것 (9) | `paging` `[T-014·T-056]` | 목록 셋(문서·분석·메시지) size>50 → 50 · size 0·page 음수·정수 아님(`abc`·`1.5`) 400 봉투 | T-014 · T-056 | red |
| | `timesAreKst` `[T-014·T-012]` | 봉투 timestamp·createdAt `+09:00` | T-014 · T-012 | red |
| | `uploadExtensionAndMime` · `uploadSizeBoundary` · `uploadTitleLength` `[T-024]` | 확장자 `.md`/`.txt`(대소문자 무시 · `.md.exe`·`.markdown`·확장자 없음 415)·MIME 허용 목록 · 정확히 200KB 201 / +1바이트 413 · 제목 100자 통과 / 101자·공백만 400 | T-024 | red |
| | `reportRequestHasNoNulls` · `historyIsLastSix` · `questionLength` · `analysisTitleIsTruncated` `[T-025]` | AI 요청에 null 없음(question "" · history [] · postingTitle) · 후속 문맥 최근 6개 오래된 순 · 질문 1000 통과/1001 400·AI 미호출 · 분석 제목 100자 절단 | T-025 | red |

내 몫이 아닌 `BoundaryAcceptanceTest` 줄(12개 중 3개): `titlesAreMasked`·`questionIsMasked` `[T-028]` = 기술 리드(내 업로드·중계 흐름 위에 마스킹 1줄씩) · `registerValidation` `[T-015]` = 팀장.
테스트 이름의 `[T-###]`가 그 줄을 green으로 만드는 티켓이다(SPEC §10 경계값 행).

AI는 MockWebServer가 흉내낸다(`AcceptanceSupport`): `X-Internal-Token: test-internal-token`이 아니면 401 — 헤더 빠지면 전부 깨진다. `aiDown = true`면 연결을 끊는다.
확인(전체): `cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,AnalysisAcceptanceTest,BoundaryAcceptanceTest'`

CI(`.github/workflows/ci.yml`): **1단계(필수)** = `JobgapApplicationTests` + `PiiMaskerTest` + DB 없는 단위 6클래스(`PiiMaskerEdgeTest`·`GlobalExceptionHandlerTest`·`CorsConfigTest`·`JwtProviderTest`·`PageRequestsTest`·`ApiResponseJsonTest`) —
내 엔티티 매핑이 `validate`에서 깨지면 `JobgapApplicationTests`가 깨져 **팀 전체 CI 1단계가 red**다. **2단계** = 위 판정 테스트 전부(`mvn -B test` · D5까지 red 허용 · D5 T-049에서 필수로 올린다).

## 1. 완료 정의 (D5 저녁 동결)

- [ ] 위 판정 테스트 내 몫 전부 green — `DocumentAcceptanceTest` 6(①②④⑤⑥⑦) + ③은 기술 리드 T-028이 green으로(내 업로드 흐름 위) · `AnalysisAcceptanceTest` 6 · `BoundaryAcceptanceTest` 중 내 티켓 9개
- [ ] `node seams/check-api.mjs http://localhost` green(compose · `OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1` = 시드 lee의 문서·분석)
- [ ] 스트림 curl(SPEC §4.3)에서 토큰이 **시간 간격을 두고** 찍힌다 · 30초 넘는 답변도 완주
- [ ] AI 컨테이너를 멈춘 상태: 업로드·삭제 503 봉투 캡처 · 스트림은 `event: error` (T-038)
- [ ] `fix(security): [S-01] 문서·분석 소유 검증 · B-2 [T-026]` 커밋 1개(방어만) · IDOR 403 회귀 테스트 1
- [ ] `docs/3`·`docs/4` `TODO(` 0 (T-045 · 3번 4절 벡터는 AI가 값을 주고 내가 붙인다)
- [ ] 매 티켓 `node scripts/check-sec-deploy.mjs` 무출력 · `node seams/check-scope.mjs T-###` 무출력 · 본 코드 diff 150줄 이하

## 2. 만들/고칠 파일 (`backend/src/main/java/com/jobgap/…` — 담당은 티켓의 "수정 허용" 기준)

| 경로 | 역할 | 티켓(수정 허용) | 상태 |
|---|---|---|---|
| `docs/spikes/sse-relay.md` | 스파이크② 명령·출력·결론 5줄 | T-006 | 만들 것 |
| `resources/db/migration/V1__schema.sql`·`V2__seed.sql` | 테이블 4 · 시드(사용자 2 · 문서 4 · lee 분석 1 + 메시지 2) — 바꾸면 `V3__…` | T-012 | 있음(검토) |
| `document/Document.java` · `DocumentRepository.java` | 엔티티 · 리포지토리(+ T-026용 `findWithOwner` @Query) | T-013 | **만들 것** |
| `analysis/Analysis.java` · `AnalysisMessage.java` · `AnalysisRepository.java` · `AnalysisMessageRepository.java` | 엔티티 둘 · 리포지토리 둘 | T-013 (AnalysisRepository는 T-055도) | **만들 것** |
| `document/DocumentService.java` | 목록·상세·수정·단순 삭제 / 업로드 / 삭제 순서 / 소유 검증 | T-014 · T-024 · T-055 · T-026 · T-038 (T-028 기술 리드 마스킹 1줄) | 골격 |
| `document/DocumentController.java`·`DocumentDtos.java` | 계약 — 시그니처 고정(필요 시만) | T-014 | 있음 |
| `ai/AiClient.java` · `ai/AiProperties.java` | RestClient(ingest·delete) / WebClient(analyze) | T-024(`ai/`) · T-025(`AiClient`) · T-038 | 골격 |
| `analysis/AnalysisService.java` | 스트림 중계 / 목록·메시지 / 소유 검증 | T-025 · T-056 · T-026 · T-038 (T-028 기술 리드 마스킹 1줄) | 골격 |
| `analysis/AnalysisController.java` · `analysis/AnalysisDtos.java` | 계약 — 시그니처 고정 | T-025(Controller) · T-056(Dtos) | 있음 |
| `backend/src/test/java/com/jobgap/document/`·`…/analysis/` | 내 테스트(IDOR 회귀 1 포함) | T-014(document/) · T-026(둘 다) | 만들 것 |
| `docs/3-*` · `docs/4-*` | DB·API 설계서 실물 대조 | T-045 | 초안 있음 |

쓰기만: `common/PageRequests`(of · documentSort) · `PageResponse.of(Page, mapper)` · `BusinessException`·`ErrorCode` · `security/AuthUser` ·
`AuditLog.forbidden` · `PiiMasker.mask`/`maskAndTrim`(연결은 T-028 기술 리드) · `user/User`·`UserRepository.findByUuid`(BE-인증).

**SeedIngestRunner는 내 파일이 아니다** — `seed/SeedIngestRunner.java`는 T-027(팀장) 수정 허용 · 골격 주석 "오너: BE-인증". 나는 그것이 **호출만 하는**
`DocumentRepository`·`AiClient.deleteDocument/ingest`를 제공한다(T-027 수용 기준 "BF의 리포지토리·AiClient는 호출만"). 데모 시드 재적용(`SPRING_PROFILES_ACTIVE=seed`)은 T-052(DevOps).
SPEC §8도 같다 — 팀장 칸 "시드 적재(`seed/SeedIngestRunner` · T-027)", 내 칸 "시드 SQL(V2) · SeedIngestRunner가 부르는 리포지토리·AiClient 제공". 내 몫은 `V2__seed.sql`(T-012)과 위 두 부품이다.

## 3. 티켓별 구현 명세

각 절: 선행 · 수정 허용 · 수용 기준 요지 · 확인 명령(티켓 그대로) · 구현 지침. 공통 수용 기준(모든 티켓): `node scripts/check-sec-deploy.mjs` 무출력 · `node seams/check-scope.mjs T-###` 무출력 · 본 코드 diff 150줄 이하.
확인 명령은 테스트 **클래스 전체**를 돌리므로 다른 티켓 몫의 줄은 red로 남을 수 있다 — 그 티켓의 수용 기준 줄이 green이면 된다.

### T-006 스파이크② (D1 · 선행 —)
- 수정 허용: `docs/spikes/`
- 수용 기준: `docs/spikes/sse-relay.md`에 명령·출력·결론 5줄(성공/실패와 전환안) · **스파이크 코드는 머지하지 않는다(브랜치에만** — 임시 `spike/<이름>` 브랜치, 통합 브랜치에 병합하지 않음 · GitHub규약 §1).
- 확인 명령:
```bash
curl -sN -X POST localhost:8080/<스파이크 경로>
```
- 지침: FastAPI 목(`cd ai-module && AI_INTERNAL_TOKEN=dev-token uv run uvicorn mock_app:app --port 8000` — 토큰을 0.1초 간격으로 낸다) → 임시 컨트롤러에서 `WebClient … bodyToFlux(ServerSentEvent)`를 그대로 반환 →
  `curl -N`에 토큰이 간격을 두고. BE도 **같은 토큰으로** 띄운다 — IntelliJ Run 설정 Environment variables에 `AI_INTERNAL_TOKEN=dev-token`
  (application.yml 기본값은 빈 값이라 안 넣으면 목이 401 → 업로드·삭제 503). 실패 시 스킬 P3-6 전환표(D2 오전 AI와 짝 2시간). 스파이크 코드는 T-025에서 `AiClient.analyze`로 다시 쓴다.
- 커밋: `docs(spike): SSE 중계 스파이크 결과 [T-006]`

### T-012 Flyway V1·V2 (D2 · 선행 T-004)
- 수정 허용: `backend/src/main/resources/db/migration/`
- 수용 기준: 빈 DB(볼륨 삭제) 기동 green · `BoundaryAcceptanceTest` `timesAreKst` green(T-014와 함께 — createdAt `+09:00`) · 시드 응답 시각 `+09:00` 관측 결과를 SPEC §1 표 옆에(SPEC PR).
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest='JobgapApplicationTests,BoundaryAcceptanceTest#timesAreKst'
```
- 지침: `V1`·`V2` 검토(바꿀 것은 SPEC §2 PR 먼저) · **적용된 V 파일은 고치지 않는다 — V3 추가**(체크섬). 시드는 SPEC §2 그대로(kim·lee · 각 공고 1·이력서 1 · lee 분석 1 + 메시지 2 — check-api의 `OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1`).
  시간대는 `application.yml`의 `jackson.time-zone`·`hibernate.jdbc.time_zone`·`timezone.default_storage: NORMALIZE`가 맡는다(파일 오너는 나 · SPEC §1 JSON·시간 행).
  관측 결과(시드 응답 시각 `+09:00`)는 **값만 기술 리드에게 넘긴다** — SPEC §1 관측 줄은 기술 리드가 T-016(수정 허용 `SPEC.md`)으로 적는다(SPEC.md는 이 티켓 수정 허용 밖이라 내가 커밋하면 check-scope RED).
- 커밋: `chore(db): Flyway V1 스키마·V2 시드 확인 [T-012]`

### T-013 엔티티·리포지토리 (D2 · 선행 T-012 · T-015(User))
- 수정 허용: `document/Document.java` · `document/DocumentRepository.java` · `analysis/Analysis.java` · `analysis/AnalysisMessage.java` · `analysis/AnalysisRepository.java` · `analysis/AnalysisMessageRepository.java`
- 수용 기준: `@Table`·`@Column(nullable,length)` · snake_case · to-one LAZY · enum `columnDefinition="VARCHAR(20)"` · sources `"TEXT"` · 양방향은 `Analysis.messages` 하나(mappedBy · cascade ALL · orphanRemoval) · 메서드 이름 쿼리 1 + `@Query` 1 · `validate` 통과.
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest=JobgapApplicationTests
```
- 지침 — 공통: `@Table(name)` · 전 필드 `@Column(name, nullable, length)` · to-one 전부 `@ManyToOne(fetch = FetchType.LAZY)` + `@JoinColumn(name = "…_id")` ·
  날짜 `OffsetDateTime`(`@PrePersist`로 now) · enum은 `@Enumerated(EnumType.STRING)` **+ `columnDefinition = "VARCHAR(20)"`**(Hibernate 6.2+는 MariaDB에서 enum을 native `enum(...)`으로 기대해 `validate`가 깨진다) · 본문 `columnDefinition = "MEDIUMTEXT"` · `sources`는 `columnDefinition = "TEXT"`(없으면 varchar(255)로 기대해 validate 실패).

| 엔티티 | 필드 → 컬럼 (정본 `V1__schema.sql`) |
|---|---|
| Document `documents` | id · owner(User, owner_id) · docType(DocumentType, doc_type 20) · title(100) · content(MEDIUMTEXT) · charCount(char_count) · maskedCount(masked_count) · createdAt |
| Analysis `analyses` | id · owner(User, owner_id) · posting(Document, posting_id) · resume(Document, resume_id) · title(100) · createdAt · **messages** |
| AnalysisMessage `analysis_messages` | id · analysis(Analysis, analysis_id) · role(String 10: USER/ASSISTANT) · content(MEDIUMTEXT) · sources(TEXT · JSON 문자열) · createdAt |

```java
// Analysis — 유일한 양방향(R-BE04 · 이유: 대화 화면이 메시지를 순서대로 읽고, 분석과 생명주기가 같다)
@OneToMany(mappedBy = "analysis", cascade = CascadeType.ALL, orphanRemoval = true)
@OrderBy("id ASC")
private List<AnalysisMessage> messages = new ArrayList<>();
public AnalysisMessage addMessage(String role, String content, String sourcesJson) { … messages.add(m); return m; }
```
리포지토리(메서드 이름 쿼리 1 + `@Query` 1 이상 — R-BE09 · 파라미터 바인딩만, 문자열 이어붙이기 금지 — B-1):
- `DocumentRepository`: `Page<Document> findByOwnerId(Long ownerId, Pageable p)` · `Page<Document> findByOwnerIdAndDocType(Long, DocumentType, Pageable)` ·
  `boolean existsByOwnerIdAndTitle(Long, String)` · `boolean existsByOwnerIdAndTitleAndIdNot(Long, String, Long)` ·
  `@Query("select d from Document d join fetch d.owner where d.id = :id") Optional<Document> findWithOwner(@Param("id") Long id)` — **T-026이 쓴다**(T-026 수정 허용에 리포지토리가 없으니 여기서 만들어 둔다)
- `AnalysisRepository`: `Page<Analysis> findByOwnerIdOrderByCreatedAtDesc(Long, Pageable)` ·
  `@Query("select a from Analysis a where a.posting.id = :docId or a.resume.id = :docId") List<Analysis> findAllUsing(@Param("docId") Long docId)` (T-055가 쓴다 · T-055도 이 파일 수정 허용)
- `AnalysisMessageRepository`: `Page<AnalysisMessage> findByAnalysisIdOrderByIdAsc(Long, Pageable)` · `List<AnalysisMessage> findTop6ByAnalysisIdOrderByIdDesc(Long)` · `long countByAnalysisId(Long)` · `Optional<AnalysisMessage> findTopByAnalysisIdOrderByIdDesc(Long)`
  (T-056 수정 허용에 리포지토리가 없다 — 목록·메시지용 메서드는 여기서 다 만든다)
- 커밋: `feat(domain): 문서·분석·메시지 엔티티와 리포지토리 [T-013]`

### T-014 문서 목록·상세·제목 수정·삭제(단순 삭제) — 소유 검증 없이 (D2 · 선행 T-013)
- 수정 허용: `document/DocumentService.java` · `document/DocumentController.java` · `document/DocumentDtos.java` · `backend/src/test/java/com/jobgap/document/`
- 수용 기준: `DocumentAcceptanceTest` ① ⑥ green · `BoundaryAcceptanceTest` `paging`(문서 목록 줄) · `timesAreKst` green · 정렬 `PageRequests.documentSort()` · 페이지 `PageRequests.of()` · 서비스에만 `@Transactional`(조회 readOnly) · check-api 문서 행 green(403 행 제외).
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,BoundaryAcceptanceTest#paging+timesAreKst'
```
  (`paging`은 분석·메시지 목록 줄도 함께 단언한다 — 메서드 전체 green은 T-056 뒤.)
- 지침 — 시그니처(골격 그대로): `list(AuthUser me, DocumentType type, int page, int size, String sort)` · `get(AuthUser me, Long id)` · `updateTitle(AuthUser me, Long id, String title)` · `delete(AuthUser me, Long id)`.
  - `@Transactional(readOnly = true)`: list·get / `@Transactional`: updateTitle·delete. 컨트롤러·리포지토리에 붙이지 않는다(R-BE10).
  - list: `User owner = userRepository.findByUuid(me.uuid())` → `PageRequests.of(page, size, PageRequests.documentSort(sort))` → type 유무로 쿼리 둘 중 하나 → `PageResponse.of(page, d -> new DocumentSummary(String.valueOf(d.getId()), …))`.
  - get: 없으면 404 `DOCUMENT_NOT_FOUND`. **여기서는 소유 검사를 넣지 않는다**(S-01 조치 전 이력 — T-062 재현 → T-026에서 별도 커밋).
  - updateTitle: 같은 소유자의 다른 문서와 제목 중복 → 409 `DUPLICATE_TITLE`(`existsByOwnerIdAndTitleAndIdNot`). 빈 제목 400은 `TitleUpdateRequest`의 `@NotBlank`가 낸다.
  - delete(단순): 없으면 404 → `documentRepository.delete(d)`. AI DELETE·분석 정리는 **T-055**(그 전에는 분석이 참조하는 문서 삭제가 FK RESTRICT로 실패한다 — 알고 넘어간다).
- 커밋: `feat(document): 문서 목록·상세·제목 수정·삭제 API [T-014]`

### T-024 AiClient 단건(ingest·delete)과 업로드 흐름 (D3 · 선행 T-014 · T-018)
- 수정 허용: `backend/src/main/java/com/jobgap/ai/` · `document/DocumentService.java`
- 수용 기준: `DocumentAcceptanceTest` ④ ⑤ green(③은 T-028 뒤) · `BoundaryAcceptanceTest` `uploadExtensionAndMime` · `uploadSizeBoundary` · `uploadTitleLength` green · RestClient connect 3s·read 30s · `X-Internal-Token` · 실패 → AI_UNAVAILABLE · 검증(확장자·MIME·UTF-8·빈 파일·크기 직접 검사) → 저장 → 커밋 → ingest → 실패 시 행 삭제.
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,BoundaryAcceptanceTest#uploadExtensionAndMime+uploadSizeBoundary+uploadTitleLength'
```
- 지침 — AiClient 생성자에서 두 클라이언트를 만든다(`AiProperties` 주입 · 값은 application.yml `app.ai`):
```java
var rf = new SimpleClientHttpRequestFactory();
rf.setConnectTimeout(props.connectTimeoutMs()); rf.setReadTimeout(props.readTimeoutMs());
this.rest = RestClient.builder().baseUrl(props.baseUrl()).requestFactory(rf)
        .defaultHeader("X-Internal-Token", props.internalToken()).build();
HttpClient http = HttpClient.create().option(ChannelOption.CONNECT_TIMEOUT_MILLIS, props.connectTimeoutMs())
        .responseTimeout(Duration.ofSeconds(props.streamTimeoutSeconds()));   // 유휴(읽기 사이) 시간 — 전체 상한은 T-025의 Flux.timeout
this.web = WebClient.builder().baseUrl(props.baseUrl()).clientConnector(new ReactorClientHttpConnector(http))
        .defaultHeader("X-Internal-Token", props.internalToken()).build();
// ingest/deleteDocument: try { rest.post()… .retrieve().body(IngestResult.class); }
//                        catch (RestClientException e) { throw new BusinessException(ErrorCode.AI_UNAVAILABLE); }
// deleteDocument: rest.delete().uri("/internal/documents/{id}?ownerUuid={o}", id, ownerUuid).retrieve().toBodilessEntity();   // T-055가 쓴다
```
  ingest 요청 본문 키는 SPEC §6.1 그대로: `documentId`·`ownerUuid`·`docType`·`title`·`text` · `ownerUuid`는 `AuthUser.uuid()`에서만(SPEC §6 공통).
  업로드 `upload(AuthUser me, MultipartFile file, DocumentType type, String title)` — **메서드에 `@Transactional`을 붙이지 않는다**(ingest를 트랜잭션 밖에서 · SPEC §1 업로드 순서):

| 순서 | 검사 | 실패 |
|---|---|---|
| 1 | 확장자 `.md`/`.txt`(소문자 비교 — `CV.MD` 통과 · `.md.exe`·`.markdown`·확장자 없음 거절) · MIME ∈ {text/markdown, text/x-markdown, text/plain, application/octet-stream, 빈 값} | 415 `UNSUPPORTED_FILE` |
| 2 | `file.getSize() > 200 * 1024` (MockMvc는 multipart 한도를 안 건다 — 직접) | 413 `FILE_TOO_LARGE` |
| 3 | `file.isEmpty()` | 400 `VALIDATION_ERROR` |
| 4 | UTF-8 **엄격** 디코딩(아래) | 415 |
| 5 | (T-028 기술 리드가 1줄 연결) `PiiMasker.mask(text)` → `Result(text, count)` · 제목은 `maskAndTrim(title, 100)` | — |
| 6 | 같은 소유자·같은 제목 — T-028 뒤에는 **마스킹된 제목으로** 검사(UNIQUE가 마스킹된 값에 걸린다 · SPEC §1 "검증 → 마스킹 → 저장") | 409 `DUPLICATE_TITLE` |
| 7 | 저장(TransactionTemplate · 커밋) → `aiClient.ingest(...)` → 예외면 행 삭제(TransactionTemplate) 후 503 재던짐 | 503 `AI_UNAVAILABLE` |

  제목 1~100자·공백만 400은 컨트롤러 `@NotBlank @Size(max = 100)`(`@Validated`)가 낸다.
```java
String text;
try {
    text = StandardCharsets.UTF_8.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT)
            .decode(ByteBuffer.wrap(file.getBytes())).toString();
} catch (CharacterCodingException e) { throw new BusinessException(ErrorCode.UNSUPPORTED_FILE); }

Document saved = tx.execute(s -> documentRepository.save(Document.create(owner, type, title, text, masked)));  // TransactionTemplate tx
try { aiClient.ingest(String.valueOf(saved.getId()), me.uuid(), type.name(), saved.getTitle(), saved.getContent()); }
catch (BusinessException e) { tx.executeWithoutResult(s -> documentRepository.deleteById(saved.getId())); throw e; }
```
- 커밋: `feat(document): AI 클라이언트·업로드 흐름 [T-024]`

### T-055 문서 삭제 순서 (D3 · 선행 T-024)
- 수정 허용: `document/DocumentService.java` · `analysis/AnalysisRepository.java`
- 수용 기준: `DocumentAcceptanceTest` ⑦ green — AI DELETE → 그 문서를 쓴 분석 → 문서 · AI 실패면 503이고 DB 그대로.
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest=DocumentAcceptanceTest
```
- 지침 — 순서 SPEC §6.4 · 첫 단계 실패 시 DB 그대로. `delete`에는 `@Transactional`을 붙이지 않고(AI 호출이 트랜잭션 밖) DB 두 단계만 TransactionTemplate 하나로:
```java
// (존재 확인 404 — T-026 뒤에는 소유 403이 먼저, 아래 ownedDocument)
aiClient.deleteDocument(String.valueOf(id), me.uuid());          // ① 실패 → 503 · 아래로 안 감
tx.executeWithoutResult(s -> {
    analysisRepository.deleteAll(analysisRepository.findAllUsing(id)); // ② 메시지는 orphanRemoval (FK RESTRICT라 먼저)
    documentRepository.deleteById(id);                               // ③
});
```
  AI의 DELETE는 없어도 204(멱등 · SPEC §6.4)라 재시도해도 된다.
- 커밋: `feat(document): 문서 삭제 순서 — AI 청크 → 분석 → 문서 [T-055]`

### T-025 분석 스트림 중계 (D3 · 선행 T-006 · T-013 · T-019)
- 수정 허용: `analysis/AnalysisService.java` · `analysis/AnalysisController.java` · `ai/AiClient.java`
- 수용 기준: `AnalysisAcceptanceTest` ① ③ ④ ⑤ green · `BoundaryAcceptanceTest` `reportRequestHasNoNulls` · `historyIsLastSix` · `questionLength` · `analysisTitleIsTruncated` green ·
  WebClient 전체 상한 `Flux.timeout(290s)`(responseTimeout은 유휴 시간이라 상한이 아니다 · SPEC §1 SSE·AI 호출 행) · done·error 없이 EOF면 `event: error` · analysis 이벤트 선행 · done 가로채 ASSISTANT 저장 후 done{messageId} · 끊김·error면 미저장 · 스트림 curl(SPEC §4.3)에서 토큰이 시간 간격을 두고. 소유 검증은 T-026에서 별도 커밋.
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest='AnalysisAcceptanceTest,BoundaryAcceptanceTest#reportRequestHasNoNulls+historyIsLastSix+questionLength+analysisTitleIsTruncated'
```
- 지침 — `stream(AuthUser me, StreamRequest req)`: **동기 검증과 USER 저장을 먼저 끝내고 Flux를 반환**(검증 실패는 Advice가 JSON 봉투 — ②):
  1. 형식: `StreamRequest`의 `@Pattern`(id) · `@Size(max = 1000)`(질문)이 컨트롤러 `@Valid`에서 400(1001자 → `VALIDATION_ERROR` · AI 미호출).
  2. 조합: `analysisId` 있으면 후속(question 공백이면 400) · 없으면 postingId·resumeId 필수(없으면 400).
  3. 존재·업무 규칙(T-026에서 그 앞에 소유 403 추가): 문서/분석 없으면 404 · 종류 불일치 400 `DOCUMENT_TYPE_MISMATCH`.
  4. 새 분석: `Analysis` 생성 · title = `(posting.title + " × " + resume.title)` 100자 절단 · USER 메시지 content = `"갭 분석 리포트"`(기본 · 4번 §5.3 예시) · sources `"[]"`.
     후속: history = `findTop6ByAnalysisIdOrderByIdDesc`(= `app.ai.history-size` 6)를 **USER 저장 전에** 읽어 오래된 순으로 뒤집기 → 그 다음 USER 저장(T-028 뒤에는 마스킹된 질문).
  5. 2~4는 TransactionTemplate 한 번(짧게) — 스트림 동안 커넥션을 잡지 않는다(SPEC §4.3 저장 경계).
  6. `aiClient.analyze(me.uuid(), postingId, resumeId, postingTitle, mode, question, history)` → 아래 중계.
```java
StringBuilder answer = new StringBuilder(); AtomicReference<String> sources = new AtomicReference<>("[]");
AtomicBoolean finished = new AtomicBoolean(false);                 // done 또는 error를 보냈는가
Flux<ServerSentEvent<String>> relay = aiClient.analyze(...)        // AiClient 안에서 .timeout(Duration.ofSeconds(290)) — 전체 상한
    .concatMap(ev -> switch (String.valueOf(ev.event())) {
        case "token" -> { answer.append(json.readValue(ev.data(), String.class)); yield Mono.just(ev); } // data는 그대로 흘림
        case "sources" -> { sources.set(ev.data()); yield Mono.just(ev); }
        case "done" -> Mono.fromCallable(() -> saveAssistant(analysisId, answer.toString(), sources.get())) // 새 짧은 트랜잭션
                .subscribeOn(Schedulers.boundedElastic())
                .doOnNext(id -> finished.set(true))
                .map(id -> ServerSentEvent.<String>builder().event("done").data("{\"messageId\":\"" + id + "\"}").build());
        case "error" -> { finished.set(true); yield Mono.just(ev); }   // 그대로 흘림 — 저장 안 함
        default -> Mono.just(ev);
    })
    .onErrorResume(e -> { finished.set(true); return Mono.just(errorEvent()); })   // 연결 실패·타임아웃(TimeoutException)
    // AI가 done·error 없이 스트림을 닫으면(EOF) 화면이 "생성 중"에 멈춘다 — error로 마감(SPEC §1 AI 호출 행 · §4.3 "장애 = error로 끝난다")
    .concatWith(Mono.defer(() -> finished.get() ? Mono.empty() : Mono.just(errorEvent())));
return isNew ? Flux.concat(Mono.just(analysisEvent(analysisId)), relay) : relay;  // analysis 이벤트가 맨 앞
```
   - `json.readValue` 예외는 checked — 람다 밖 헬퍼로 감싼다. `errorEvent()` = `event("error")` + data `objectMapper.writeValueAsString(ApiResponse.error(ErrorCode.AI_UNAVAILABLE))`.
   - 끊김(중단 버튼)은 `done`이 오지 않으니 저장되지 않는다 — 별도 `doOnCancel` 불필요(넣으면 로그만).
   - WebClient: `post().uri("/internal/analyze/stream").bodyValue(body).retrieve().bodyToFlux(new ParameterizedTypeReference<ServerSentEvent<String>>() {})`
     `.timeout(Duration.ofSeconds(props.streamTimeoutSeconds()))` — `responseTimeout`은 토큰이 계속 오면 끝나지 않으므로 **스트림의 실제 상한은 이 `Flux.timeout(290s)` 하나**다
     (290s < nginx `proxy_read_timeout 310s` · `spring.mvc.async.request-timeout=300s`는 일반 async용이고 Flux SSE에는 걸리지 않는다 — SPEC §1 SSE 설정 행). **RestClient로 받으면 끝까지 버퍼링**.
   - AI 요청 본문 키는 SPEC §6.2 그대로: ownerUuid·postingId·resumeId·postingTitle·mode(REPORT|FOLLOWUP)·question(REPORT면 "")·history[{role,content}].
     **null을 보내지 않는다** — `question`은 `""`, `history`는 `List.of()`로 정규화(Jackson은 null도 직렬화하고 AI는 `"question":null`을 400으로 거부한다 — `reportRequestHasNoNulls`가 잡고,
     AI 목(mock_app)도 실물 스키마로 검사한다).
- 커밋: `feat(analysis): AI 스트림 중계 [T-025]`

### T-056 분석 목록(lastStatus 파생)·메시지 페이징 (D3 · 선행 T-025)
- 수정 허용: `analysis/AnalysisService.java` · `analysis/AnalysisDtos.java`
- 수용 기준: `AnalysisAcceptanceTest` ⑥의 목록·페이징 단언(403 단언은 T-026 뒤) · `BoundaryAcceptanceTest` `paging`(분석 목록·메시지 줄) green.
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest='AnalysisAcceptanceTest,BoundaryAcceptanceTest#paging'
```
- 지침 — 컨트롤러는 이미 연결돼 있다(`GET /api/analyses` 기본 size 20 · `GET /api/analyses/{id}/messages` 기본 size 50). 리포지토리는 T-013에서 만든 것만 쓴다.
  - `list(AuthUser me, int page, int size)`: `@Transactional(readOnly = true)` · `PageRequests.of(page, size, Sort.unsorted())` → `findByOwnerIdOrderByCreatedAtDesc`(최신순 고정 · SPEC §4.3) →
    `AnalysisSummary(id 문자열, title, posting.title, resume.title, messageCount, lastStatus, createdAt)` · `lastStatus` = `findTopByAnalysisIdOrderByIdDesc`의 role이 ASSISTANT면 `DONE` 아니면 `INCOMPLETE`(저장하지 않고 파생 — SPEC §2) ·
    `messageCount` = `countByAnalysisId`(N+1 감수 — 50건 상한 · T-038에서 확인). DTO 변환은 트랜잭션 안에서(LAZY).
  - `messages(AuthUser me, Long analysisId, int page, int size)`: `@Transactional(readOnly = true)` · 없으면 404 `ANALYSIS_NOT_FOUND` · `findByAnalysisIdOrderByIdAsc`(오래된 순) ·
    sources는 DB 문자열 그대로(`MessageResponse`의 `@JsonRawValue` → 배열로 나간다).
  - page·size 규칙(size>50 → 50 · 음수/0 400)은 `PageRequests.of`가 한다.
- 커밋: `feat(analysis): 분석 목록·메시지 페이징 [T-056]`

### T-026 [S-01] 소유 검증 (D3 · 선행 T-014 · T-025 · T-062(FE-분석 재현))
- 수정 허용: `document/DocumentService.java` · `analysis/AnalysisService.java` · `backend/src/test/java/com/jobgap/document/` · `backend/src/test/java/com/jobgap/analysis/`
- 수용 기준: FE-분석의 조치 전 재현(T-062) 캡처 **뒤에** 머지 · 소유(403) → 존재(404) → 업무 규칙(400) · `AuditLog.forbidden(...)` · `DocumentAcceptanceTest` ② · `AnalysisAcceptanceTest` ② ⑥ green · IDOR 회귀 테스트 1.
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,AnalysisAcceptanceTest'
```
- 지침 — 방어만 담은 커밋 하나(기능과 섞지 않는다 — "조치 전"이 이력에 남아야 한다). 두 서비스에 한 헬퍼 패턴:
```java
// owner는 LAZY다 — 삭제는 이 헬퍼를 트랜잭션 밖(AI 호출 전)에서 부르므로 open-in-view=false에서 getOwner().getUuid()가
// LazyInitializationException(→ 500)이 난다. owner를 함께 읽는 @Query(T-013에서 만든 findWithOwner)로 가져온다.
private Document ownedDocument(AuthUser me, Long id) {
    Document d = documentRepository.findWithOwner(id).orElseThrow(() -> new BusinessException(ErrorCode.DOCUMENT_NOT_FOUND));
    if (!d.getOwner().getUuid().equals(me.uuid())) {   // 본인 소유만 — ADMIN 예외 없음
        AuditLog.forbidden(me.uuid(), "document", id);
        throw new BusinessException(ErrorCode.FORBIDDEN);
    }
    return d;
}
```
- get·updateTitle·delete·stream(문서·분석)·messages 전부 이 헬퍼를 지난다(삭제는 AI 호출 **전에**). 순서: 형식(@Valid 400) → 소유(403) → 존재(404) → 업무 규칙(종류 400) — SPEC §4 공통 · ADR-06.
  단건은 위 헬퍼처럼 조회 먼저여도 결과가 같다(없는 문서는 소유를 따질 수 없어 404).
  문서 둘을 보는 스트림은 **둘 다 조회한 뒤** 하나라도 남의 것이면 403, 그다음 없는 것이 있으면 404, 그다음 종류 불일치 400(남의 문서 종류가 400 메시지로 새지 않게 — ADR-06).
  분석(`ownedAnalysis`)은 messages(readOnly 트랜잭션 안)·stream(TransactionTemplate 안)에서만 부르므로 LAZY owner를 그대로 읽어도 된다 · `AuditLog.forbidden(me.uuid(), "analysis", id)`.
- IDOR 403 회귀 테스트 1: `backend/src/test/java/com/jobgap/document/`에 `@AcceptanceTest` + `AcceptanceSupport`(public) 상속으로 남의 문서 GET 403.
- 머지 뒤 FE-분석이 같은 요청 403 + 감사 로그 1줄로 재확인한다(T-062 · SPEC §7 S-01 재확인 칸).
- 커밋: `fix(security): [S-01] 문서·분석 소유 검증 · B-2 [T-026]`

### T-038 500 경로 점검 · N+1 확인 (D4 · 선행 T-025)
- 수정 허용: `backend/src/main/java/com/jobgap/document/` · `backend/src/main/java/com/jobgap/analysis/` · `backend/src/main/java/com/jobgap/ai/`
- 수용 기준: AI 컨테이너 중지 상태 업로드·삭제 503 봉투 · 스트림 event: error 캡처.
- 확인 명령:
```bash
docker compose stop ai-service && OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1 node seams/check-api.mjs http://localhost
```
- 지침: 삭제 중 AI 실패 → 503·DB 그대로 / 스트림 중 AI 다운 → 200 유지·마지막 `event: error`(SPEC §4.4 503 행 · §1 AI 호출 행) · `open-in-view=false`에서 LazyInitializationException(→ 500)이 없는지 ·
  분석 목록 N+1이 size 50 상한 안인지(SQL 로그). 캡처는 기술 리드에게(동적 점검 T-034 원장 B 행). 고칠 것이 나오면 커밋 `fix(analysis): … [T-038]`.

### T-045 3번·4번 문서 실물 대조 (D5 · 선행 T-056)
- 수정 허용: `docs/3-*` · `docs/4-*`
- 수용 기준: DDL·엔드포인트 12·에러 표가 코드와 일치.
- 확인 명령:
```bash
grep -c 'TODO(' docs/3-* docs/4-*
```
- 지침: `docs/3-…` 2절 테이블·제약은 `V1__schema.sql` 발췌(정본은 DDL — `ddl-auto: validate`) · 3절 관계는 엔티티와 대조 · **4절 벡터 DB는 AI에게 값(임베딩 차원·청크 설정)을 받아 내가 붙인다**(`TODO(D3·AI)` — AI 티켓엔 `docs/3-*` 수정 허용이 없다 · T-045 수용 기준).
  `docs/4-…` 엔드포인트 12 + 에러 표(SPEC §4.4) — `node seams/check-api.mjs` 출력과 대조 · 머리말 "기준 커밋" 기입.
- 커밋: `docs(be): DB·API 설계서 실물 대조 [T-045]`

## 4. 받는 것 · 주는 것

| 방향 | 누구 | 무엇 | 언제 |
|---|---|---|---|
| 받음 | BE-인증(팀장) | `User`·`UserRepository.findByUuid` (T-015) | D2 오전 |
| 받음 | AI | 실물 `/internal/*`(T-018 ingest·delete · T-019 스트림 · 목은 D1부터 `mock_app.py`) | D2 저녁~D3 |
| 받음 | FE-분석 | S-01 조치 전 재현 캡처(T-062) — 그 뒤 T-026 머지 | D3 |
| 받음 | AI | 3번 4절 벡터 값(임베딩 차원·청크 설정 실측 · T-045에 붙인다) | D5 |
| 받음 | 기술 리드 | T-028 PiiMasker 연결 1줄씩(내 `DocumentService`·`AnalysisService` — SPEC §7 "BE-기능 리뷰") | D3 |
| 줌 | FE-화면·FE-분석 | `/api/documents/**`·`/api/analyses/**` 실물(목과 같은 모양) | D2·D3 |
| 줌 | BE-인증(팀장) | `DocumentRepository`·`AiClient`(SeedIngestRunner · T-027이 호출만) | D3 |
| 줌 | BE-인증(팀장) | 5번 §6 AiClient 생성자 발췌 · 엔티티 규약 표 내 3행(팀장이 T-044에서 붙인다) | D5 |
| 줌 | AI | 7번 §7 Backend 연동 문장(AI가 T-046에서 붙인다) | D5 |
| 줌 | 기술 리드 | T-012 시드 응답 시각 관측값(SPEC §1 관측 줄 — T-016) | D2 |
| 줌 | DevOps | compose E2E(T-032)에서 쓸 백엔드 · 스트림 curl 결과 | D3 저녁 |
| 공유 | application.yml | 파일 오너는 나(머리 주석) · 내 블록 `spring.datasource`·`jpa`·`flyway`·`jackson`·`servlet.multipart`·`mvc.async`·`app.ai` · security·ai 블록은 기술 리드 리뷰 · 다른 블록은 그 오너 | 상시 |

## 5. 일정 (`tasks/BOARD.md`·`tasks/ROADMAP.md`)

| 날 | 할 일 |
|---|---|
| D1 11/5 목 | T-006 스파이크② (실패 시 전환표) |
| D2 11/6 금 | T-012 → T-013 → T-014 |
| D3 11/9 월 | T-024 → T-055 → T-025 → T-056 → (T-062 재현 확인 후) T-026 · 저녁 compose E2E(DevOps T-032)와 스트림 curl |
| D4 11/10 화 | T-038 · 동적 점검(기술 리드 T-034)에 캡처 제공 |
| D5 11/11 수 | T-045 · EC2 클릭 경로(팀장 T-047) 참여 · **저녁 기능 동결** |
| D6 11/12 목 | 버그픽스·리허설 · 발표 "스트림 중계" 한 문장 |

## 6. 막힐 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| 스트림이 한꺼번에 도착 | RestClient로 받음 / nginx buffering | WebClient `bodyToFlux` · nginx는 DevOps(`proxy_buffering off` 있음) |
| 30초·수 분에 끊김 | 타임아웃 사슬 | 스트림 상한은 AiClient `Flux.timeout(290s)` 하나 · nginx 310s(DevOps) · application.yml async 300s는 일반 async용(Flux SSE엔 안 걸림 — SPEC §1) |
| 스트림 끝에 401·AccessDenied | ASYNC 재진입 인가 | SecurityConfig의 `dispatcherTypeMatchers(ASYNC, ERROR).permitAll()`(SPEC §1 SSE 설정 행) — 지웠는지 |
| 업로드·삭제가 전부 503 / AI 목 401 | BE의 `AI_INTERNAL_TOKEN`이 비었음(기본값 빈 값) | Run 설정에 `AI_INTERNAL_TOKEN=dev-token`(목 기본값과 같게) |
| ① 토큰에 따옴표 두 겹 | data를 다시 JSON 인코딩 | AI data를 그대로 흘리고, 저장용만 디코드 |
| ① done에 messageId 없음 | AI done을 그대로 흘림 | §T-025 concatMap |
| ② 403이 HTML/406 | Accept 협상 | Advice가 JSON 고정(있음) · 검증을 Flux 만들기 전에 |
| ③ history 3개 | 이번 질문까지 읽음 | USER 저장 **전에** history 조회 |
| compose에서만 스트림 400 | AI 요청에 `"question":null`·`"history":null` | `""`·`List.of()`로 정규화(`reportRequestHasNoNulls`) |
| ⑤ 행이 남음 | upload 전체가 @Transactional | 저장·삭제만 TransactionTemplate |
| ⑦ 500 FK | 분석이 문서를 참조(FK RESTRICT) | T-055 — 분석 먼저 삭제 |
| 업로드 .md가 415(브라우저) | MIME가 octet-stream | MIME 허용 목록에 octet-stream·빈 값 |
| validate 실패 content | MEDIUMTEXT 매핑 | `columnDefinition = "MEDIUMTEXT"` |
| validate 실패 doc_type·sources | enum은 native enum, TEXT는 varchar(255)로 기대 | `columnDefinition = "VARCHAR(20)"` · `"TEXT"` |
| LazyInitializationException | open-in-view=false | DTO 변환을 트랜잭션 안에서 · 트랜잭션 밖 소유 검사는 `findWithOwner`(join fetch) |
| check-scope RED | 수정 허용 밖 파일(예: T-026에서 리포지토리) | 그 파일을 고치는 티켓에서 미리(T-013) — 또는 티켓 범위 조정을 팀장과 |

## 7. 내가 쓰는 문서 절

| 파일 · 절 | 정본 | 누가 커밋 |
|---|---|---|
| `docs/3-데이터베이스설계서.md` 1~3절 테이블·제약·관계 · 4절 벡터(AI가 준 값) | `V1__schema.sql` · AI 실측 | 나 — T-045 |
| `docs/4-API설계서.md` 엔드포인트 12 · 공통 응답 · 에러 | SPEC §4 · `node seams/check-api.mjs` 출력 | 나 — T-045 |
| `docs/5-Backend개발명세서.md` §4.1.1 엔티티 규약 표의 내 3행 · §4.4 Repository · §6 AI 모듈 연동(`TODO(D3·BE-기능)` AiClient 생성자 발췌) | `document/`·`analysis/`·`ai/` | 문장·발췌 제공 → 팀장이 T-044에서(`docs/5-*`는 T-044 수정 허용) |
| `docs/7-AI모듈연동명세서.md` §7 Backend 연동 | `AiClient` | 문장 제공 → AI가 T-046에서(`docs/7-*`는 T-046 수정 허용) |

## 8. 코딩 에이전트 지시서 예시 (T-025)

```
[배경] SPEC.md §4.3 전체(이벤트 순서·BE 중계 규칙·저장 경계)와 §6.2 요청 본문, §1 AI 호출·SSE 설정 행을 그대로 붙인다.
       골격: AnalysisController(시그니처 고정) · AnalysisService.stream(미구현) · AiClient.analyze(미구현).
       T-013 리포지토리(findTop6ByAnalysisIdOrderByIdDesc 등)는 이미 있다.
[목표] AI SSE를 화면까지 중계하고 완주 시에만 ASSISTANT를 저장한다. (목록·메시지 페이징은 T-056 — 이번에 하지 않는다)
[수용 기준]
 - AnalysisAcceptanceTest ①③④⑤ green · BoundaryAcceptanceTest reportRequestHasNoNulls·historyIsLastSix·questionLength·analysisTitleIsTruncated green
 - 검증·USER 저장은 Flux 생성 전 동기 처리 · 스트림은 트랜잭션 밖 · 답변 저장은 새 짧은 트랜잭션
 - AI의 done은 가로채 저장 후 done{"messageId"} · error·끊김은 미저장 · 연결 실패·타임아웃은 onErrorResume → event: error AI_UNAVAILABLE
 - done·error 없이 EOF면 event: error로 마감 · 전체 상한 Flux.timeout(290s)
 - 새 분석은 analysis 이벤트가 맨 앞 · history = USER 저장 전 최근 6개(오래된 순) · AI 요청에 null 금지(question "" · history [])
[제약] 수정 허용: backend/src/main/java/com/jobgap/analysis/AnalysisService.java · backend/src/main/java/com/jobgap/analysis/AnalysisController.java ·
       backend/src/main/java/com/jobgap/ai/AiClient.java
       acceptance/·security/·common/·Controller 시그니처 수정 금지 · 소유 검증은 넣지 않는다(T-026) · 커밋하지 말 것
[확인 명령] cd backend && ./mvnw test -Dtest='AnalysisAcceptanceTest,BoundaryAcceptanceTest#reportRequestHasNoNulls+historyIsLastSix+questionLength+analysisTitleIsTruncated'
```

## 10. 내 티켓 전체 (최신 · `tasks/BOARD.md`의 BF 행 — 위 절과 번호가 다르면 이 표가 이긴다)

150줄 규칙으로 쪼갠 것: T-014 → T-014(목록·상세·수정·단순 삭제) + **T-055**(삭제 순서) · T-025 → T-025(스트림 중계) + **T-056**(목록·메시지 페이징)

| 날 | 티켓 | 할 일 | 선행 |
|---|---|---|---|
| D1 | [T-006](../tasks/T-006-spike-sse.md) | 스파이크②: FastAPI 토큰 3개 → Spring WebClient 중계 → curl에 시간 간격을 두고 보인다. | — |
| D2 | [T-012](../tasks/T-012-flyway.md) | Flyway V1·V2를 빈 DB에서 적용하고 시드 시각 오프셋을 관측한다. | T-004 |
| D2 | [T-013](../tasks/T-013-entities.md) | Document·Analysis·AnalysisMessage 엔티티와 리포지토리 3개. | T-012 · T-015(User) |
| D2 | [T-014](../tasks/T-014-document-read-api.md) | 문서 목록·상세·제목 수정·삭제(단순 삭제) — **소유 검증 없이**(S-01 조치 전 상태). | T-013 |
| D3 | [T-024](../tasks/T-024-ai-client-upload.md) | AiClient 단건(ingest·delete)과 업로드 흐름. | T-014 · T-018 |
| D3 | [T-055](../tasks/T-055-delete-order.md) | 문서 삭제 순서: AI DELETE → 그 문서를 쓴 분석 → 문서 · AI 실패면 503이고 DB 그대로. | T-024 |
| D3 | [T-025](../tasks/T-025-stream-relay.md) | 분석 스트림 중계 — 새 분석·후속 질문 · done 가로채 저장. | T-006 · T-013 · T-019 |
| D3 | [T-056](../tasks/T-056-analysis-list.md) | 분석 목록(lastStatus 파생)·메시지 페이징. | T-025 |
| D3 | [T-026](../tasks/T-026-s01-ownership.md) | `fix(security): [S-01] 문서·분석 소유 검증 · B-2 [T-026]` — 방어만 담은 커밋 하나. | T-014 · T-025 · T-062(FE-분석 재현) |
| D4 | [T-038](../tasks/T-038-be-500-check.md) | 500 경로 점검(삭제 중 AI 실패 · 스트림 중 AI 다운) · N+1 확인. | T-025 |
| D5 | [T-045](../tasks/T-045-docs34.md) | 3번·4번 문서 실물 대조. | T-056 |

매일 규칙: `onboarding/README.md` · git: `onboarding/GitHub규약.md` · 화면 눈 검사: `seams/smoke.md` · 하루 끝 3줄: `worklog/<내이름>/D#.md`
