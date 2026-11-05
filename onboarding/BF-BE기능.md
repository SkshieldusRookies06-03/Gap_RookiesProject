# 레인 명세 — BE-기능

> 정본은 `SPEC.md`(§1 업로드·AI 호출·SSE 행 · §2 · §4.2 · §4.3 · §6). 이 문서는 SPEC을 **구현 단위로 푼 것**이다 — 다르면 SPEC이 이긴다.
> 팀에서 가장 어려운 사슬(AI 스트림 → Spring 중계 → 화면)의 가운데다. 판정 테스트(`acceptance/`)는 고치지 않는다.

## 0. 판정 테스트 표

| 테스트 | 줄 | 요약 | 티켓 | D1 |
|---|---|---|---|---|
| `DocumentAcceptanceTest` | ① `list` | 내 것만 · id 문자열 · 목록에 content 없음 · page 7필드 · type 필터 · sort 허용 밖/page -1/type 밖 400 | T-014 | red |
| | ② `detail_ownership` | [S-01] 내 것 200(content·maskedCount) · 남의 GET/PUT/DELETE 403 · 없는 id 404 | T-014 → **T-026** | red |
| | ③ `upload_masksAndIngests` | 201 · ingest 본문에 내 uuid·`"docType":"RESUME"` · 원문 연락처 없음 · `masked_count`=2 | T-024 + **T-028(기술 리드)** | red |
| | ④ `upload_rejects` | .exe 415 · 빈 파일 400 · 300KB 413 · 같은 제목 409 · EUC-KR 415 | T-024 | red |
| | ⑤ `upload_aiDown` | AI 다운 → 503 `AI_UNAVAILABLE` · 행이 남지 않음 | T-024 | red |
| | ⑥ `updateTitle` | 200 · 빈 제목 400 · 다른 내 문서와 같은 제목 409 | T-014 | red |
| | ⑦ `delete_order` | AI 다운이면 503·문서 그대로 → 정상이면 AI DELETE(`ownerUuid=` 내 uuid) · 그 문서를 쓴 분석 삭제 · 문서 삭제 | T-024 | red |
| `AnalysisAcceptanceTest` | ① `newAnalysis_relaysAndSaves` | analysis → token(JSON 문자열 그대로) → sources → done{messageId} · USER·ASSISTANT 저장(토큰 디코드 연결) · AI 요청에 uuid·REPORT·postingId | T-025 | red |
| | ② `validation_beforeStream` | (Accept: text/event-stream) 남의 문서 403 · 종류 뒤바뀜 400 `DOCUMENT_TYPE_MISMATCH` · 후속 빈 질문 400 · 없는 분석 404 · AI 미호출 | T-025 + **T-026** | red |
| | ③ `followUp` | FOLLOWUP · question 그대로 · history 2개(이번 질문 제외) · analysis 이벤트 없음 | T-025 | red |
| | ④ `aiError_notSaved` | AI가 error → 그대로 흘림 · ASSISTANT 저장 안 함 | T-025 | red |
| | ⑤ `aiDown_isEventError` | AI 연결 실패 → 200 유지 · 마지막 `event: error` `AI_UNAVAILABLE` | T-025 | red |
| | ⑥ `listAndMessages` | lastStatus DONE/INCOMPLETE 파생 · postingTitle · messages page/size · 남의 분석 403(양방향) | T-025 + **T-026** | red |

AI는 MockWebServer가 흉내낸다(`AcceptanceSupport`): `X-Internal-Token: test-internal-token`이 아니면 401 — 헤더 빠지면 전부 깨진다.
확인: `cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,AnalysisAcceptanceTest'`

## 1. 완료 정의 (D5 저녁 동결)

- [ ] 위 13개 green(③은 T-028 연결 후)
- [ ] `node seams/check-api.mjs http://localhost` green(compose · `OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1`)
- [ ] 스트림 curl(SPEC §4.3)에서 토큰이 **시간 간격을 두고** 찍힌다 · 30초 넘는 답변도 완주
- [ ] AI 컨테이너를 멈춘 상태: 업로드·삭제 503 봉투 캡처 · 스트림은 `event: error` (R-BE14 증거)
- [ ] `fix(security): [S-01] …` 커밋 1개(방어만) · IDOR 403 회귀 테스트 1
- [ ] `docs/3`·`docs/4` FILL 0

## 2. 만들/고칠 파일 (`backend/src/main/java/com/jobgap/…`)

| 경로 | 역할 | 티켓 | 상태 |
|---|---|---|---|
| `resources/db/migration/V1__schema.sql`·`V2__seed.sql` | 테이블 4 · 시드 | T-012 | 있음(검토) |
| `document/Document.java` · `DocumentRepository.java` | 엔티티 · 리포지토리 | T-013 | **만들 것** |
| `analysis/Analysis.java` · `AnalysisMessage.java` · `AnalysisRepository.java` · `AnalysisMessageRepository.java` | 엔티티 둘 · 리포지토리 둘 | T-013 | **만들 것** |
| `document/DocumentService.java` | 목록·상세·업로드·수정·삭제 | T-014 · T-024 · T-026 | 골격 |
| `analysis/AnalysisService.java` | 스트림 중계·목록·메시지 | T-025 · T-026 | 골격 |
| `ai/AiClient.java` | RestClient·WebClient | T-024 · T-025 | 골격 |
| `document/DocumentController.java`·`DocumentDtos.java`·`analysis/AnalysisController.java`·`AnalysisDtos.java`·`ai/AiProperties.java` | 계약 — 시그니처 고정 | — | 있음 |
| `backend/src/test/java/com/jobgap/document/`·`…/analysis/` | 내 테스트(IDOR 회귀 1 포함) | T-026 | 만들 것 |

쓰기만: `common/PageRequests`(of · documentSort) · `PageResponse.of(Page, mapper)` · `BusinessException`·`ErrorCode` · `security/AuthUser` ·
`AuditLog.forbidden` · `PiiMasker.mask`(연결은 T-028 기술 리드) · `user/User`·`UserRepository.findByUuid`(BE-인증).

## 3. 티켓별 구현 명세

### T-006 스파이크② (D1 · 30분 캡)
FastAPI 목(`cd ai-module && AI_INTERNAL_TOKEN=dev-token uvicorn mock_app:app --port 8000`) → 임시 컨트롤러에서 `WebClient … bodyToFlux(ServerSentEvent)`를 그대로 반환 →
`curl -N`에 토큰이 0.1초 간격으로. 실패 시 스킬 P3-6 전환표(D2 오전 AI와 짝 2시간). 임시 코드는 커밋하지 않고 T-025로 옮긴다.

### T-012 Flyway (D2 · 선행 T-004)
`V1`·`V2` 검토(바꿀 것은 SPEC §2 PR 먼저) · 빈 DB 기동 green · 시드 시각 응답 `+09:00` 관측. 적용된 V 파일 수정 금지(D3 이후 `V3__…`).
- 커밋: `chore(db): Flyway V1 스키마·V2 시드 확인 [T-012]`

### T-013 엔티티·리포지토리 (D2 · 선행 T-012 · BE-인증의 `User`)
공통: `@Table(name)` · 전 필드 `@Column(name, nullable, length)` · to-one 전부 `@ManyToOne(fetch = FetchType.LAZY)` + `@JoinColumn(name = "…_id")` ·
날짜 `OffsetDateTime`(`@PrePersist`로 now) · enum은 `@Enumerated(EnumType.STRING)` · 본문 `columnDefinition = "MEDIUMTEXT"`.

| 엔티티 | 필드 → 컬럼 |
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
리포지토리(메서드 이름 쿼리 1 + `@Query` 1 이상 — R-BE09):
- `DocumentRepository`: `Page<Document> findByOwnerId(Long ownerId, Pageable p)` · `Page<Document> findByOwnerIdAndDocType(Long, DocumentType, Pageable)` ·
  `boolean existsByOwnerIdAndTitle(Long, String)` · `boolean existsByOwnerIdAndTitleAndIdNot(Long, String, Long)`
- `AnalysisRepository`: `Page<Analysis> findByOwnerIdOrderByCreatedAtDesc(Long, Pageable)` ·
  `@Query("select a from Analysis a where a.posting.id = :docId or a.resume.id = :docId") List<Analysis> findAllUsing(@Param("docId") Long docId)`
- `AnalysisMessageRepository`: `Page<AnalysisMessage> findByAnalysisIdOrderByIdAsc(Long, Pageable)` · `List<AnalysisMessage> findTop6ByAnalysisIdOrderByIdDesc(Long)` · `long countByAnalysisId(Long)` · `Optional<AnalysisMessage> findTopByAnalysisIdOrderByIdDesc(Long)`
- 커밋: `feat(domain): 문서·분석·메시지 엔티티와 리포지토리 [T-013]`

### T-014 문서 API — 소유 검증 없이 (D2 · 선행 T-013)
시그니처(골격 그대로): `list(AuthUser me, DocumentType type, int page, int size, String sort)` · `get(AuthUser me, Long id)` · `updateTitle(AuthUser me, Long id, String title)` · `delete(AuthUser me, Long id)`.
- `@Transactional(readOnly = true)`: list·get / `@Transactional`: updateTitle. 컨트롤러·리포지토리에 붙이지 않는다(R-BE10).
- list: `User owner = userRepository.findByUuid(me.uuid())` → `PageRequests.of(page, size, PageRequests.documentSort(sort))` → type 유무로 쿼리 둘 중 하나 → `PageResponse.of(page, d -> new DocumentSummary(String.valueOf(d.getId()), …))`.
- get: 없으면 404 `DOCUMENT_NOT_FOUND`. **여기서는 소유 검사를 넣지 않는다**(S-01 조치 전 이력 — T-026에서 별도 커밋).
- updateTitle: 같은 소유자의 다른 문서와 제목 중복 → 409 `DUPLICATE_TITLE`.
- green: ① · ⑥ · 확인 `./mvnw test -Dtest=DocumentAcceptanceTest` · check-api 문서 행(403 제외)
- 커밋: `feat(document): 문서 목록·상세·제목 수정 API [T-014]`

### T-024 AiClient 단건 · 업로드 · 삭제 (D3 · 선행 T-014 · AI T-018)
AiClient 생성자에서 두 클라이언트를 만든다(`AiProperties` 주입):
```java
var rf = new SimpleClientHttpRequestFactory();
rf.setConnectTimeout(props.connectTimeoutMs()); rf.setReadTimeout(props.readTimeoutMs());
this.rest = RestClient.builder().baseUrl(props.baseUrl()).requestFactory(rf)
        .defaultHeader("X-Internal-Token", props.internalToken()).build();
HttpClient http = HttpClient.create().option(ChannelOption.CONNECT_TIMEOUT_MILLIS, props.connectTimeoutMs())
        .responseTimeout(Duration.ofSeconds(props.streamTimeoutSeconds()));
this.web = WebClient.builder().baseUrl(props.baseUrl()).clientConnector(new ReactorClientHttpConnector(http))
        .defaultHeader("X-Internal-Token", props.internalToken()).build();
// ingest/deleteDocument: try { rest.post()… .retrieve().body(IngestResult.class); }
//                        catch (RestClientException e) { throw new BusinessException(ErrorCode.AI_UNAVAILABLE); }
// delete: rest.delete().uri("/internal/documents/{id}?ownerUuid={o}", id, ownerUuid).retrieve().toBodilessEntity();
```
업로드 `upload(AuthUser me, MultipartFile file, DocumentType type, String title)` — **메서드에 `@Transactional`을 붙이지 않는다**(ingest를 트랜잭션 밖에서):

| 순서 | 검사 | 실패 |
|---|---|---|
| 1 | 확장자 `.md`/`.txt`(소문자 비교) · MIME ∈ {text/markdown, text/x-markdown, text/plain, application/octet-stream, 빈 값} | 415 `UNSUPPORTED_FILE` |
| 2 | `file.getSize() > 200 * 1024` (MockMvc는 multipart 한도를 안 건다 — 직접) | 413 `FILE_TOO_LARGE` |
| 3 | `file.isEmpty()` | 400 `VALIDATION_ERROR` |
| 4 | UTF-8 **엄격** 디코딩(아래) | 415 |
| 5 | 같은 소유자·같은 제목 | 409 `DUPLICATE_TITLE` |
| 6 | (T-028) `PiiMasker.mask(text)` · 제목도 | — |
| 7 | 저장(TransactionTemplate · 커밋) → `aiClient.ingest(...)` → 예외면 행 삭제(TransactionTemplate) 후 503 재던짐 | 503 `AI_UNAVAILABLE` |

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
삭제 `delete` (순서 SPEC §6.4 · 첫 단계 실패 시 DB 그대로):
```java
aiClient.deleteDocument(String.valueOf(id), me.uuid());          // ① 실패 → 503 · 아래로 안 감
tx.executeWithoutResult(s -> {
    analysisRepository.deleteAll(analysisRepository.findAllUsing(id)); // ② 메시지는 orphanRemoval
    documentRepository.deleteById(id);                               // ③
});
```
- green: ④ ⑤ ⑦ (③은 T-028 연결 뒤) · 확인 `./mvnw test -Dtest=DocumentAcceptanceTest`
- 커밋: `feat(document): AI 클라이언트·업로드·삭제 순서 [T-024]`

### T-025 스트림 중계 · 목록 · 메시지 (D3 · 선행 T-006 · T-013 · AI T-019)
`stream(AuthUser me, StreamRequest req)` — **동기 검증과 USER 저장을 먼저 끝내고 Flux를 반환**(검증 실패는 Advice가 JSON 봉투 — ②):
1. 조합: `analysisId` 있으면 후속(question 공백이면 400) · 없으면 postingId·resumeId 필수(없으면 400).
2. 소유·존재(T-026에서 소유 403 추가): 문서/분석 없으면 404 · 종류 불일치 400 `DOCUMENT_TYPE_MISMATCH`.
3. 새 분석: `Analysis` 생성 · title = `(posting.title + " × " + resume.title)` 100자 절단 · USER 메시지 content = question 또는 `"갭 분석 리포트"`(기본) · sources `"[]"`.
   후속: history = `findTop6ByAnalysisIdOrderByIdDesc` 를 **USER 저장 전에** 읽어 오래된 순으로 뒤집기 → 그 다음 USER 저장.
4. 1~3은 TransactionTemplate 한 번(짧게) — 스트림 동안 커넥션을 잡지 않는다.
5. `aiClient.analyze(me.uuid(), postingId, resumeId, postingTitle, mode, question, history)` → 아래 중계.
```java
StringBuilder answer = new StringBuilder(); AtomicReference<String> sources = new AtomicReference<>("[]");
Flux<ServerSentEvent<String>> relay = aiClient.analyze(...)
    .concatMap(ev -> switch (String.valueOf(ev.event())) {
        case "token" -> { answer.append(json.readValue(ev.data(), String.class)); yield Mono.just(ev); } // data는 그대로 흘림
        case "sources" -> { sources.set(ev.data()); yield Mono.just(ev); }
        case "done" -> Mono.fromCallable(() -> saveAssistant(analysisId, answer.toString(), sources.get())) // 새 짧은 트랜잭션
                .subscribeOn(Schedulers.boundedElastic())
                .map(id -> ServerSentEvent.<String>builder().event("done").data("{\"messageId\":\"" + id + "\"}").build());
        default -> Mono.just(ev);                                    // error 등은 그대로 — 저장 안 함
    })
    .onErrorResume(e -> Mono.just(ServerSentEvent.<String>builder().event("error").data(aiUnavailableJson()).build()));
return isNew ? Flux.concat(Mono.just(analysisEvent(analysisId)), relay) : relay;  // analysis 이벤트가 맨 앞
```
   - `json.readValue` 예외는 checked — 람다 밖 헬퍼로 감싼다. `aiUnavailableJson()` = `objectMapper.writeValueAsString(ApiResponse.error(ErrorCode.AI_UNAVAILABLE))`.
   - 끊김(중단 버튼)은 `done`이 오지 않으니 저장되지 않는다 — 별도 `doOnCancel` 불필요(넣으면 로그만).
   - WebClient: `post().uri("/internal/analyze/stream").bodyValue(body).retrieve().bodyToFlux(new ParameterizedTypeReference<ServerSentEvent<String>>() {})`. **RestClient로 받으면 끝까지 버퍼링**.
   - AI 요청 본문 키는 SPEC §6.2 그대로: ownerUuid·postingId·resumeId·postingTitle·mode(REPORT|FOLLOWUP)·question(REPORT면 "")·history[{role,content}].
6. `list(AuthUser me, int page, int size)`: `@Transactional(readOnly = true)` · 최신순 · `lastStatus` = 마지막 메시지 role이 ASSISTANT면 DONE 아니면 INCOMPLETE(N+1 감수 — 50건 상한).
7. `messages(AuthUser me, Long analysisId, int page, int size)`: 오래된 순 · sources는 DB 문자열 그대로(`@JsonRawValue`).
- green: ①③④⑤ · ②⑥ 일부 · 확인 `./mvnw test -Dtest=AnalysisAcceptanceTest` + SPEC §4.3 curl
- 커밋: `feat(analysis): AI 스트림 중계·분석 목록·메시지 페이징 [T-025]`

### T-026 [S-01] 소유 검증 (D3 · 선행 T-014·T-025 · 기술 리드 재현 뒤)
- 방어만 담은 커밋. 두 서비스에 한 헬퍼 패턴:
```java
private Document ownedDocument(AuthUser me, Long id) {
    Document d = documentRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.DOCUMENT_NOT_FOUND));
    if (!d.getOwner().getUuid().equals(me.uuid()) && !me.isAdmin()) {
        AuditLog.forbidden(me.uuid(), "document", id);
        throw new BusinessException(ErrorCode.FORBIDDEN);
    }
    return d;
}
```
- get·updateTitle·delete·stream(문서·분석)·messages 전부 이 헬퍼를 지난다(삭제는 AI 호출 **전에**). 순서: 형식(@Valid) → 존재/소유 → 업무 규칙(종류).
- IDOR 403 회귀 테스트 1: `backend/src/test/java/com/jobgap/document/`에 `AcceptanceSupport`를 상속해 남의 문서 GET 403.
- green: Document ② · Analysis ②⑥ · 확인 `./mvnw test -Dtest='DocumentAcceptanceTest,AnalysisAcceptanceTest'`
- 커밋: `fix(security): [S-01] 문서·분석 소유 검증 · B-2 [T-026]`

### T-038 500 경로 점검 (D4)
AI 컨테이너 정지 상태로 업로드·삭제(503 봉투)·스트림(event: error) · `open-in-view=false`에서 LazyInitialization 없는지 · 캡처를 기술 리드에게.
커밋(필요 시): `fix(analysis): … [T-038]`

### T-045 3·4번 문서 (D5)
`docs/3-…`: V1 DDL 발췌·제약 열 / `docs/4-…`: 엔드포인트 12 + 에러 표(SPEC §4.4) — check-api 결과와 대조. 커밋: `docs(be): DB·API 설계서 실물 대조 [T-045]`

## 4. 받는 것 · 주는 것

| 방향 | 누구 | 무엇 | 언제 |
|---|---|---|---|
| 받음 | BE-인증 | `User`·`UserRepository.findByUuid` | D2 오전 |
| 받음 | AI | 실물 `/internal/*`(목은 D1부터 `mock_app.py`) | D2 저녁~D3 |
| 받음 | 기술 리드 | S-01 재현 캡처(그 뒤 T-026 머지) · T-028 PiiMasker 연결 1줄(내 파일 — 리뷰는 내가) | D3 |
| 줌 | 팀장·FE-분석 | `/api/documents/**`·`/api/analyses/**` 실물(목과 같은 모양) | D2·D3 |
| 줌 | BE-인증 | `DocumentRepository`·`AiClient`(SeedIngestRunner) | D3 |
| 공유 | application.yml | 내 블록 `spring.datasource`·`jpa`·`flyway`·`servlet.multipart`·`mvc.async`·`app.ai` · 다른 블록은 그 오너 | 상시 |

## 5. 일정

| 날 | 할 일 |
|---|---|
| D1 11/5 목 | T-006 스파이크② (실패 시 전환표) |
| D2 11/6 금 | T-012 → T-013 → T-014 |
| D3 11/9 월 | T-024 → T-025 → (재현 확인 후) T-026 · 저녁 compose E2E(DevOps T-032)와 스트림 curl |
| D4 11/10 화 | T-038 · 동적 점검 보조 |
| D5 11/11 수 | T-045 · EC2 클릭 경로 · **저녁 동결** |
| D6 11/12 목 | 버그만 · 발표 "스트림 중계" 한 문장 |

## 6. 막힐 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| 스트림이 한꺼번에 도착 | RestClient로 받음 / nginx buffering | WebClient `bodyToFlux` · nginx는 DevOps(이미 off) |
| 30초에 끊김 | async 타임아웃 | application.yml 300s(있음) |
| 스트림 끝에 401·AccessDenied | ASYNC 재진입 인가 | SecurityConfig에 있음 — 지웠는지 |
| ① 토큰에 따옴표 두 겹 | data를 다시 JSON 인코딩 | AI data를 그대로 흘리고, 저장용만 디코드 |
| ① done에 messageId 없음 | AI done을 그대로 흘림 | §T-025 concatMap |
| ② 403이 HTML/406 | Accept 협상 | Advice가 JSON 고정(있음) · 검증을 Flux 만들기 전에 |
| ③ history 3개 | 이번 질문까지 읽음 | USER 저장 **전에** history 조회 |
| ⑤ 행이 남음 | upload 전체가 @Transactional | 저장·삭제만 TransactionTemplate |
| ⑦ 500 FK | 분석이 문서를 참조 | 분석 먼저 삭제 |
| 업로드 .md가 415(브라우저) | MIME가 octet-stream | MIME 허용 목록에 octet-stream·빈 값 |
| validate 실패 content | MEDIUMTEXT 매핑 | `columnDefinition = "MEDIUMTEXT"` |
| LazyInitializationException | open-in-view=false | DTO 변환을 트랜잭션 안에서 |

## 7. 내가 쓰는 문서 절

| 파일 · 절 | 정본 |
|---|---|
| `docs/3-데이터베이스설계서.md` 테이블·제약 (4절 벡터는 AI) | `V1__schema.sql` |
| `docs/4-API설계서.md` 엔드포인트 12 · 에러 | SPEC §4 · `node seams/check-api.mjs` 출력 |
| `docs/5-…` 엔티티 규약 표의 내 3행 · AI 클라이언트 절 | `document/`·`analysis/`·`ai/` |
| `docs/7-…` §7 백엔드 연동 부분(AI 레인 파일 — 문장 제공) | `AiClient` |

## 8. 코딩 에이전트 지시서 예시 (T-025)

```
[배경] SPEC.md §4.3 전체(이벤트 순서·BE 중계 규칙·저장 경계)와 §6.2 요청 본문을 그대로 붙인다.
       골격: AnalysisController(시그니처 고정) · AnalysisService.stream/list/messages(미구현) · AiClient.analyze(미구현).
[목표] AI SSE를 화면까지 중계하고 완주 시에만 ASSISTANT를 저장한다. 목록·메시지 페이징.
[수용 기준]
 - ./mvnw test -Dtest=AnalysisAcceptanceTest 에서 ①③④⑤ green
 - 검증·USER 저장은 Flux 생성 전 동기 처리 · 스트림은 트랜잭션 밖 · 답변 저장은 새 짧은 트랜잭션
 - AI의 done은 가로채 저장 후 done{"messageId"} · error·끊김은 미저장 · 연결 실패는 onErrorResume → event: error AI_UNAVAILABLE
 - 새 분석은 analysis 이벤트가 맨 앞 · history = USER 저장 전 최근 6개(오래된 순)
[제약] 수정 허용: backend/src/main/java/com/jobgap/analysis/ · backend/src/main/java/com/jobgap/ai/AiClient.java
       acceptance/·security/·common/·Controller 시그니처 수정 금지 · 소유 검증은 넣지 않는다(T-026) · 커밋하지 말 것
[확인 명령] cd backend && ./mvnw test -Dtest=AnalysisAcceptanceTest
```
