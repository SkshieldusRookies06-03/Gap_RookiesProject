# API 설계서

> 정본 기준 · 기준 커밋: `ed8bee4` · v1.0 — 2026-11-05 · 문서 오너: BE-기능
> 정본은 `SPEC.md` §1·§4. 이 문서는 SPEC과 목 서버(`mock/server.mjs`)가 내는 응답 모양을 그대로 옮긴 것이다 — 다르면 SPEC이 이긴다.
> **외부 계약 / 내부 계약**: 이 문서는 브라우저 ↔ 백엔드(`/api/**`)만 다룬다. 백엔드 ↔ AI 내부 API(`/internal/**`)는 7번 §4.

## 1. 기본 정보

- **Base URL**: 배포 = nginx 경유 **같은 출처**(경로 `/api/...` 그대로) · 로컬 = `http://localhost:8080`(같은 경로). 접두어 `/api`는 엔드포인트에만 붙는다 — 프론트 `VITE_API_URL`은 로컬 `http://localhost:8080`, 배포 빌드는 빈 문자열(`/api`를 넣으면 `/api/api/…`).
- **인증 방식**: `Authorization: Bearer <accessToken>` 헤더 · JWT HS256 · subject = 사용자 uuid · Access 15분 · Refresh 14일(회전)

인증 열 범례: **공개**(토큰 없음) · **로그인**(유효한 Access) · **소유자**(로그인 + 리소스 주인 · 아니면 403) · **ADMIN**(`/actuator/**` 중 health 제외)
검증 순서(SPEC §4 공통): 인증 → 요청 형식(@Valid · 400) → 소유(403) → 존재(404) → 업무 규칙(400).
JSON: camelCase · id는 문자열(`"12"`) · 시각은 ISO 8601 `+09:00`.

| # | 메서드 · 경로 | 인증 | 절 |
|---|---|---|---|
| 1 | POST `/api/auth/register` | 공개 | 3.1 |
| 2 | POST `/api/auth/login` | 공개 | 3.2 |
| 3 | POST `/api/auth/refresh` | 공개(Refresh 본문) | 3.3 |
| 4 | POST `/api/auth/logout` | 로그인 | 3.4 |
| 5 | GET `/api/documents` | 로그인(본인 것만) | 4.1 |
| 6 | POST `/api/documents` | 로그인 | 4.2 |
| 7 | GET `/api/documents/{id}` | 소유자 | 4.3 |
| 8 | PUT `/api/documents/{id}` | 소유자 | 4.4 |
| 9 | DELETE `/api/documents/{id}` | 소유자 | 4.5 |
| 10 | POST `/api/analyses/stream` | 소유자(문서·분석) | 5.1 |
| 11 | GET `/api/analyses` | 로그인(본인 것만) | 5.2 |
| 12 | GET `/api/analyses/{id}/messages` | 소유자 | 5.3 |

## 2. 공통 응답 형식

```json
성공 {"success":true,"data":{…},"message":"요청이 완료되었습니다","timestamp":"2026-11-06T10:00:00+09:00"}
목록 {"success":true,"data":{"content":[…],"page":{"number":0,"size":20,"totalElements":2,"totalPages":1,"first":true,"last":true,"numberOfElements":2}},"message":"…","timestamp":"…"}
에러 {"success":false,"data":null,"statusCode":403,"code":"FORBIDDEN","message":"접근 권한이 없습니다","timestamp":"2026-11-06T10:00:00+09:00","fields":[{"field":"title","message":"1~100자"}]}
```
- `fields`는 입력 검증 실패(400)일 때만 · 에러는 Accept와 무관하게 `application/json`(스트림 요청의 시작 전 실패도 이 봉투).
- ADR: 템플릿 `success/data/message`에 `statusCode`·`code`·`timestamp`를 얹었다 — 프론트가 메시지 문자열이 아니라 `code`로 분기하고(§6), 감사 로그·캡처와 시각을 맞추기 위해서다. 프론트는 `success`로만 성공/실패를 가른다.
- 페이지: 0-base · `page<0`·`size<1`·정수 아님 → 400 · `size>50`은 50으로 절단.

## 3. 인증 API

### 3.1 회원가입

`POST /api/auth/register` · 공개 · 201
```json
요청 {"email":"kim2@example.com","password":"Passw0rd!","name":"김루키"}
응답 {"success":true,"data":{"uuid":"3f1c2a9e-…","email":"kim2@example.com","name":"김루키"},"message":"회원가입이 완료되었습니다","timestamp":"…"}
```
검증: email 형식(`@Pattern`) · password 8~64자 · name 1~20자.

| 상태 | code | 언제 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 형식 위반(`fields[]`) |
| 409 | `DUPLICATE_EMAIL` | 이미 가입된 이메일 |

### 3.2 로그인

`POST /api/auth/login` · 공개 · 200
```json
요청 {"email":"kim@example.com","password":"Passw0rd!"}
응답 {"success":true,"data":{"accessToken":"eyJ…","refreshToken":"q8Zk…","user":{"uuid":"11111111-…","email":"kim@example.com","name":"김루키"}},"message":"로그인되었습니다","timestamp":"…"}
```

| 상태 | code | 언제 |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | 이메일·비밀번호 불일치(없는 이메일도 같은 문구) |
| 423 | `ACCOUNT_LOCKED` | 존재하는 계정 5회 실패 → 15분 잠금(message에 해제 시각) |

### 3.3 토큰 재발급

`POST /api/auth/refresh` · 공개(본문의 Refresh로 인증) · 200
```json
요청 {"refreshToken":"q8Zk…"}
응답 {"success":true,"data":{"accessToken":"eyJ…(새)","refreshToken":"Lm3x…(새)"},"message":"토큰이 재발급되었습니다","timestamp":"…"}
```
재발급하면 이전 Refresh는 즉시 무효(회전 · DB에는 SHA-256 해시만).

| 상태 | code | 언제 |
|---|---|---|
| 401 | `INVALID_REFRESH_TOKEN` | 없음 · 만료 · 이미 회전된 값 · 로그아웃 후 |

### 3.4 로그아웃

`POST /api/auth/logout` · 로그인 · 200 · 요청 본문 없음
```json
응답 {"success":true,"data":null,"message":"로그아웃되었습니다","timestamp":"…"}
```
서버의 Refresh 해시를 지운다(이후 그 Refresh는 401). Access 만료 = 401 `TOKEN_EXPIRED`(이것만 프론트가 refresh 대상) · 서명·형식 오류 = 401 `UNAUTHORIZED`.

## 4. 문서 API

### 4.1 목록 조회

`GET /api/documents?type=&page=0&size=20&sort=createdAt,desc` · 로그인(본인 문서만) · 200

| 파라미터 | 값 | 기본 | 밖이면 |
|---|---|---|---|
| `type` | `JOB_POSTING` · `RESUME` (선택) | 전체 | 400 |
| `page` · `size` | 0-base · 1~50 | 0 · 20 | 400(size>50은 절단) |
| `sort` | `createdAt` · `title` × `asc` · `desc` (`필드,방향`) | `createdAt,desc` | 400 `VALIDATION_ERROR` |

```json
{"success":true,"data":{"content":[
  {"id":"12","type":"JOB_POSTING","title":"카카오 백엔드 신입 공고","charCount":2310,"createdAt":"2026-11-06T10:00:00+09:00"},
  {"id":"15","type":"RESUME","title":"내 이력서 v2","charCount":1820,"createdAt":"2026-11-06T10:05:00+09:00"}],
 "page":{"number":0,"size":20,"totalElements":2,"totalPages":1,"first":true,"last":true,"numberOfElements":2}},
 "message":"문서 목록을 조회했습니다","timestamp":"…"}
```
목록에는 본문(`content`)을 싣지 않는다 · 빈 결과는 `content: []`.

### 4.2 업로드

`POST /api/documents` · `multipart/form-data` · 로그인 · 201

| 필드 | 값 |
|---|---|
| `file` | `.md` · `.txt` (판정은 확장자 · MIME은 `text/markdown`·`text/x-markdown`·`text/plain`·`application/octet-stream`·빈 값 허용) · UTF-8만 · **최대 200KB** |
| `type` | `JOB_POSTING` · `RESUME` |
| `title` | 1~100자 · 같은 사용자 안에서 유일 |

```json
응답 {"success":true,"data":{"id":"101","type":"RESUME","title":"내 이력서 v3","charCount":1830,"createdAt":"…"},"message":"업로드되었습니다","timestamp":"…"}
```
원본 파일은 저장하지 않는다 — 본문·제목의 연락처를 마스킹한 텍스트만 DB와 AI로 간다. 처리 순서: 검증 → 마스킹 → DB 저장(트랜잭션 끝) → AI 적재 → 실패하면 그 행을 지우고 503.
한도 사슬: 파일 200KB(서비스가 직접 검사 → 413 봉투) · 요청 1MB(Spring) = nginx `client_max_body_size 1m`.

| 상태 | code | 언제 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 빈 파일 · type·title 누락 · 제목 길이 |
| 409 | `DUPLICATE_TITLE` | 같은 제목의 내 문서가 있음 |
| 413 | `FILE_TOO_LARGE` | 200KB 초과 |
| 415 | `UNSUPPORTED_FILE` | 확장자·MIME 밖 · UTF-8 아님 |
| 503 | `AI_UNAVAILABLE` | AI 적재 실패(행은 남지 않음) |

### 4.3 상세 조회

`GET /api/documents/{id}` · 소유자 · 200
```json
{"success":true,"data":{"id":"15","type":"RESUME","title":"내 이력서 v2","charCount":1820,"createdAt":"…",
 "content":"연락처 010-****-**** · a***@x.com\n기술: Java, Spring Boot, JPA","maskedCount":2},"message":"문서를 조회했습니다","timestamp":"…"}
```

| 상태 | code | 언제 |
|---|---|---|
| 403 | `FORBIDDEN` | 남의 문서(IDOR — 점검서 B-2 · S-01) |
| 404 | `DOCUMENT_NOT_FOUND` | 없는 id |

### 4.4 제목 수정

`PUT /api/documents/{id}` · 소유자 · 200
```json
요청 {"title":"카카오 백엔드 신입 공고(수정)"}
응답 {"success":true,"data":{"id":"12","type":"JOB_POSTING","title":"카카오 백엔드 신입 공고(수정)","charCount":2310,"createdAt":"…"},"message":"제목이 수정되었습니다","timestamp":"…"}
```

| 상태 | code | 언제 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 빈 제목 · 100자 초과 |
| 403 | `FORBIDDEN` | 남의 문서 |
| 404 | `DOCUMENT_NOT_FOUND` | 없는 id |
| 409 | `DUPLICATE_TITLE` | 다른 내 문서와 같은 제목 |

### 4.5 삭제

`DELETE /api/documents/{id}` · 소유자 · 200(`data: null`)
삭제 순서: ① AI 청크 삭제(`DELETE /internal/documents/{id}?ownerUuid=`) → ② 이 문서를 공고·이력서로 쓴 분석과 그 메시지 삭제 → ③ 문서 삭제. ①이 실패하면 503이고 DB는 그대로(지운 문서가 답변에 계속 나오는 것이 더 나쁘다).

| 상태 | code | 언제 |
|---|---|---|
| 403 | `FORBIDDEN` | 남의 문서 |
| 404 | `DOCUMENT_NOT_FOUND` | 없는 id |
| 503 | `AI_UNAVAILABLE` | AI 삭제 실패 |

## 5. AI 채팅 API

### 5.1 질의 스트림 (SSE)

`POST /api/analyses/stream` · 소유자 · 200 `text/event-stream`
```json
새 분석   {"postingId":"12","resumeId":"15"}                          ← question 없음 = 기본 리포트 프롬프트
후속 질문 {"analysisId":"7","question":"부족한 것 중 뭐부터 공부해?"}   ← analysisId가 있으면 question 필수(1~1000자)
```
시작 전 검증(실패하면 스트림을 열지 않고 JSON 봉투): 형식 400(id 형식 · 질문 1000자 초과) → 소유 403 → 존재 404(`DOCUMENT_NOT_FOUND`·`ANALYSIS_NOT_FOUND`) → 업무 규칙 400(종류 `DOCUMENT_TYPE_MISMATCH` · 후속 질문 빈 값 `VALIDATION_ERROR`).

| 이벤트 | data | 언제 |
|---|---|---|
| `analysis` | `{"analysisId":"7"}` | 새 분석일 때 맨 앞 한 번 |
| `token` | **JSON 문자열** `"## 요구 기술\n"` (줄바꿈이 프레임을 깨지 않게) | 여러 번 |
| `sources` | `[{"type":"doc","documentId":"12","docType":"JOB_POSTING","chunk":"우대: Kubernetes","score":0.82},{"type":"web","url":"https://…","title":"…"}]` | 답변 끝 |
| `done` | `{"messageId":"31"}` | 정상 종료(답변 저장 후) |
| `error` | 에러 봉투(`AI_UNAVAILABLE` 등) | 장애 — 시작 뒤에는 상태코드 대신 이 이벤트로 끝난다 |

```
event: analysis
data: {"analysisId":"7"}

event: token
data: "## 요구 기술\n"

event: sources
data: [{"type":"doc","documentId":"12","docType":"JOB_POSTING","chunk":"우대: Kubernetes, AWS","score":0.82}]

event: done
data: {"messageId":"31"}
```
- 저장: 질문(USER) 저장 → 스트림(트랜잭션 밖) → 완주하면 답변(ASSISTANT) 저장. 사용자가 중단하거나 `error`로 끝나면 **부분 답변은 저장하지 않는다**.
- 브라우저는 `fetch` + `ReadableStream`으로 읽는다(`EventSource`는 POST·헤더 불가). `data:` 뒤 공백 0~1개 허용.
- 타임아웃 사슬: WebClient 290s < Spring async 300s < nginx 310s.

### 5.2 대화 세션 목록

`GET /api/analyses?page=0&size=20` · 로그인(본인 것만) · 최신순 고정 · 200
```json
{"success":true,"data":{"content":[
  {"id":"7","title":"카카오 백엔드 신입 공고 × 내 이력서 v2","postingTitle":"카카오 백엔드 신입 공고","resumeTitle":"내 이력서 v2",
   "messageCount":3,"lastStatus":"INCOMPLETE","createdAt":"2026-11-06T10:10:00+09:00"}],
 "page":{"number":0,"size":20,"totalElements":1,"totalPages":1,"first":true,"last":true,"numberOfElements":1}},"message":"분석 목록을 조회했습니다","timestamp":"…"}
```
`lastStatus`는 저장하지 않고 파생한다: 마지막 메시지가 ASSISTANT면 `DONE`, USER면 `INCOMPLETE`(화면 "중단됨").

### 5.3 세션 메시지 조회

`GET /api/analyses/{id}/messages?page=0&size=50` · 소유자 · 오래된 순 · 200
```json
{"success":true,"data":{"content":[
  {"id":"30","role":"USER","content":"갭 분석 리포트","sources":[],"createdAt":"…"},
  {"id":"31","role":"ASSISTANT","content":"## 요구 기술\n| 기술 | 보유 |\n|---|---|\n| Kubernetes | 없음 |",
   "sources":[{"type":"doc","documentId":"12","docType":"JOB_POSTING","chunk":"우대: Kubernetes, AWS","score":0.82}],"createdAt":"…"}],
 "page":{"number":0,"size":50,"totalElements":2,"totalPages":1,"first":true,"last":true,"numberOfElements":2}},"message":"메시지를 조회했습니다","timestamp":"…"}
```

| 상태 | code | 언제 |
|---|---|---|
| 403 | `FORBIDDEN` | 남의 분석 |
| 404 | `ANALYSIS_NOT_FOUND` | 없는 id |

## 6. HTTP 상태 코드

정본: `backend/src/main/java/com/jobgap/common/ErrorCode.java` (`@RestControllerAdvice` 한 곳에서 봉투로).

| 코드 | 설명 |
|------|------|
| 200 | 성공(조회·수정·삭제·로그인·refresh·로그아웃 · 스트림 시작) |
| 201 | 생성(회원가입 · 업로드) |
| 400 | `VALIDATION_ERROR`(형식·page/size·sort·type 허용 밖·JSON 오류·빈 파일) · `DOCUMENT_TYPE_MISMATCH` |
| 401 | `UNAUTHORIZED` · `TOKEN_EXPIRED`(refresh 대상) · `INVALID_CREDENTIALS` · `INVALID_REFRESH_TOKEN` |
| 403 | `FORBIDDEN` — 남의 리소스 · USER 토큰으로 `/actuator/metrics` |
| 404 | `DOCUMENT_NOT_FOUND` · `ANALYSIS_NOT_FOUND` · `NOT_FOUND`(없는 경로) |
| 409 | `DUPLICATE_EMAIL` · `DUPLICATE_TITLE` |
| 413 | `FILE_TOO_LARGE` — 파일 200KB 초과 |
| 415 | `UNSUPPORTED_FILE` — 확장자·MIME·UTF-8 |
| 423 | `ACCOUNT_LOCKED` — 로그인 5회 실패(ADR-05: 429는 rate limit과 섞여서 423) |
| 500 | `INTERNAL_SERVER_ERROR` — 일반 메시지만(스택은 서버 로그에만) |
| 503 | `AI_UNAVAILABLE` — 업로드·삭제 중 AI 연결·타임아웃(스트림 중이면 `event: error`) |
