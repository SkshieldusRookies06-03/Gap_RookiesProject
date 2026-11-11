# FE-분석 보안 점검 기록 — 원장 옮기기 전 원본 (오너: FE-분석 · 취합: 기술 리드)

> 이 파일에만 쓴다. `security/LEDGER.md`·`docs/9-*`는 기술 리드가 이 표를 옮긴다(T-034).
> 결과 칸 값: `발견` · `미발견` · `해당 없음(사유)` · `미조치(→ §7 잔여 위험)`. 점검 방법 칸 = **실제로 실행한 명령·도구**. 방법은 onboarding/FA-FE분석.md §9.

## S-01 재현 (T-062 · D3)

| 항목 | 값 |
|---|---|
| 조치 전 커밋 | `security/evidence/S-01/before-commit.txt` |
| 재현 요청·응답 | kim 토큰으로 lee 리소스: `GET /api/documents/3` → **200** + lee 문서(id 3 "샘플 공고 - 데이터 엔지니어") · `GET /api/analyses/1/messages` → **200** + lee 분석 메시지 2개 (2026-11-11 KST · curl + Burp Repeater `127.0.0.1:8080`) |
| 재현 위치 | 임시 브랜치(push·merge 안 함) — 문서: `demo/S-01` = `1145cfa` + cherry-pick `4dc6410`(누락된 `DocumentRepository.java`만 · 기술 리드 승인 · 조치 코드 미포함) · 분석: `demo/S-01-analysis` = `1ea077e` 원본 그대로. 조치(T-026)가 재현보다 먼저 머지되어 조치 전 커밋으로 재현 |
| 조치 커밋(T-026) | `2a3bf48` 문서 소유 검증(`findOwned` + `AuditLog.forbidden`) · `ecfc7bd` 분석 소유 검증(+ `AnalysisOwnershipRegressionTest`) — 둘 다 `origin/dev` `927bcb5`의 조상 |
| 재확인 요청·응답 | `927bcb5`(`demo/S-01-after`) · 같은 kim 계정·같은 두 요청 → 둘 다 **403** `FORBIDDEN` "접근 권한이 없습니다" · 데이터 없음 · 백엔드 로그 `403 owner-mismatch` resource=document id=3 · resource=analysis id=1 |
| 증거 | `S-01/before.json` · `burp-before.png` · `after.json` · `burp-after.png` · `audit.log` — 원본 응답 `document-before.txt` · `analysis-before.txt` · `document-after.txt` · `analysis-after.txt` · 분석 캡처 `burp-analysis-before.png` · `burp-analysis-after.png` · `burp-after.png` = `burp-document-after.png` 사본 · 캡처의 Authorization 값은 가림 |

## 원장 행

| 행 | 점검 방법(실행한 명령·도구) | 결과 | 재확인 명령·결과 | 증거 | 티켓 |
|---|---|---|---|---|---|
| B-1 | `grep -rn '" *+ *[a-z]' backend/src/main --include=*Repository.java \| wc -l` · `@Query` grep · `PageRequests.documentSort` 정적 확인 · `./mvnw test -Dtest=PageRequestsTest` · compose에서 `curl -s "http://localhost/api/documents?sort=…" -H "Authorization: Bearer $T"` 4종 + 대조군 | 미발견 — 0줄 · JPQL 1개는 `:id` 바인딩 · 단위 4 green · 실서버 `title' OR '1'='1` · `title;drop table users,asc` · `password,asc` · `(select 1),asc` 모두 400 `VALIDATION_ERROR` 봉투 · 대조군 `title,asc` 200 · 노출 0 | 같은 curl → 400 4건 (2026-11-10) | `B-1.txt` | T-063 |
| B-8 | `application.yml` · `GlobalExceptionHandler` 정적 확인 · `./mvnw test -Dtest=GlobalExceptionHandlerTest,MalformedJsonTest` · compose에서 오류 유발 요청 7종(깨진 JSON 로그인 · `page=abc` · id 문자/범위 초과 · 없는 경로 · 허용 안 된 메서드 · 업로드에 JSON) · **실제 500**: 정상 로그인 → 개인 로컬 DB 일시 중지 → 인증된 `GET /api/documents`(2026-11-10 16:29:34 KST · 사용자 실행) | 미발견 — `include-stacktrace/message: never` · 단위 6 green(500 봉투 · 제약 이름 미노출) · 실서버 4xx 7종 모두 JSON 봉투 · 노출 0 · 실제 500: `HTTP/1.1 500` `application/json` 봉투 `INTERNAL_SERVER_ERROR` "잠시 후 다시 시도해 주세요" · 스택·예외 클래스·SQL·DB 연결 정보·내부 경로 노출 0 → **PASS**. `MalformedJsonTest`는 로컬 DB 연결 실패로 ERROR(환경) — 같은 입력을 실서버로 확인 | 같은 curl · DB 일시 중지 500 (개인 로컬) | `B-8.txt` | T-063 |
| B-10 | `DocumentService.readText` · multipart 한도 · nginx 정적 확인 · compose `POST http://localhost/api/documents`에 직접(클라이언트 우회) 8건 · 전후 문서 수 | 미발견 — `a.exe`(octet-stream·text/plain 위장) · `a.html`(text/html·text/plain 위장) · `a.md.exe` · `a.txt.exe` → 415 `UNSUPPORTED_FILE` · `big.md` 307,201B → 413 `FILE_TOO_LARGE` 봉투 · `huge.md` 1,228,800B → nginx 413(HTML · 버전 없음) · 문서 수 2 → 2 | 같은 curl 8건 → 415×6 · 413×2 (2026-11-10) | `B-10.txt` | T-063 |
| B-11 | `AuthDtos.RegisterRequest` · `@Valid` · 핸들러 정적 확인 · compose `POST http://localhost/api/auth/register` 형식 오류 4종 | 미발견 — 이메일 형식 틀림+비밀번호 3자 → 400 `fields`=email·password · 이름 공백+비밀번호 65자 → password·name · `{}` → name·email·password · 모두 `VALIDATION_ERROR` · 계정 생성 없음. 참고: `@NotBlank` 기본 문구가 영어 | 같은 curl 4건 → 400 + `fields[]` (2026-11-10) | `B-11.txt` | T-063 |
| F-1 | grep 위험 렌더 API 0줄 · `ReportText.test.jsx` 4 green · 목+headless Chrome에서 문서 제목·질문·(가로챈 SSE) AI 응답·출처에 `<img onerror>`·`<script>`·`javascript:` 입력 · nginx CSP 설정 정적 확인 · compose에서 `curl.exe -sI http://localhost/` CSP 헤더 | 미발견 — 전부 글자로 보임 · alert 0 · `javascript:` 링크 0 · 실제 CSP 헤더가 설정값과 일치 | `curl.exe -sI http://localhost/ \| findstr /i "content-security"` → `default-src 'self'; …` 일치 | `F-1.txt` · `F-1-csp.txt` · `F-1.png` · `F-1-documents.png` | T-039 |
| F-2 | `authStore.js` partialize 확인 · 화면 로그인 후 localStorage·sessionStorage·cookie 키 읽기(값은 가림) · 새로고침 | 미발견 — `jobgap-auth`에 `refreshToken`·`user`만 · access는 저장소 어디에도 없음 · 새로고침 시 refresh로 복구. 잔여 위험: refresh의 localStorage 보관(§7) | DevTools 캡처 `F-2.png` — 사람이 찍을 것(아래 수동 확인) | `F-2.txt` | T-039 |
| F-3 | 새 프로필로 보호 라우트 4개 직접 접근 · localStorage refresh를 임의 값으로 바꾸고 새로고침 · 변조·만료·없는 Bearer로 API 호출(목) · `JwtProvider` 정적 확인 · compose에서 서명 1글자 바꾼 JWT로 `GET /api/documents` | 미발견 — 4개 모두 `/login` · 가짜 refresh는 401 → 세션 비움 → `/login` · 변조 Access 401(목) · 실제 백엔드: 정상 JWT 200 · 서명 변조 JWT 401 `UNAUTHORIZED` | compose 변조 JWT → 401 `UNAUTHORIZED` · `JwtProviderTest`는 미실행(Maven 의존성 오프라인 없음) | `F-3.txt` | T-039 |
| F-4 | `npm run build` 후 `grep -rn "sk-\|tvly-\|OPENAI" dist \| wc -l` · 추가 패턴 grep · `import.meta.env` 목록 | 미발견 — 0줄 · `password`는 폼 필드 이름뿐 · `VITE_*`는 `VITE_API_URL` 하나 · 소스맵 0 | 같은 명령 0 | `F-4.txt` | T-039 |
| F-5 | `cd frontend && npm audit --json > ../security/evidence/npm-audit.json` (fix 미실행) | 미발견 — 0건(critical·high·moderate·low·info 모두 0 · 의존성 280) | 같은 명령 0 | `npm-audit.json` | T-039 |
| F-6 | 화면에서 `.exe`·300KB 업로드(요청 발생 여부 함께) · 질문 textarea `maxlength` · 목에 curl로 직접(클라이언트 우회) `.exe`·300KB·질문 1001자 · `DocumentService` 정적 확인 · compose 실제 백엔드에 직접 `a.exe`·`big.md`(307,206B)·`a.txt.exe` 업로드 | 미발견 — 화면이 먼저 안내하고 요청 0건 · 목 415/413/400 · 실제 백엔드 415 `UNSUPPORTED_FILE` / 413 `FILE_TOO_LARGE` / 415 `UNSUPPORTED_FILE`. nginx 1MB 413·실제 질문 1001자는 미검증(→ B-10 · T-063) | compose `POST http://localhost/api/documents` 3건 → 415·413·415 | `F-6.txt` | T-039 |
| F-7 | 테스트 브라우저에서 응답을 가로채 500(스택 message)·503·비봉투 502·스트림 `event: error`(스택 message) · 목 423(5회 실패) · `ErrorMessage.test.jsx` 5 green | 미발견 — 화면은 `messageFor` 문구 + 다시 시도만 · 스택·내부 주소·nginx 문구 노출 0 · 423은 해제 시각만(프론트 PASS). **실제 백엔드 HTTP 500 응답**(2026-11-10 16:29:34 KST · 개인 로컬 DB 일시 중지 → 인증된 `GET /api/documents` · curl · B-8 T-063): `application/json` 봉투 `INTERNAL_SERVER_ERROR` "잠시 후 다시 시도해 주세요" · 스택·예외·SQL·DB 정보·내부 경로 노출 0. **실제 브라우저(2026-11-10)**: A) DB 중지 후 새로고침 → refresh 약 30초 뒤 500 → 세션 비움 → `/login`(문서 목록 요청 없음 · 500 화면 아님) · B) 새로고침 없이 필터 변경 → 약 10초 뒤 canceled → "서버에 연결할 수 없습니다"+다시 시도 · 노출 없음(네트워크 오류 UI만 확인). **실제 브라우저 2(2026-11-10)**: C) 테스트 한정 Hikari timeout 3000ms · MariaDB 중지 · 새로고침 없이 필터 → `GET /api/documents` HTTP 500(약 3.03초) → "잠시 후 다시 시도해 주세요"+다시 시도 · SQL·DB 정보·스택·내부 경로 노출 없음(이 요청의 응답 본문은 미확인) · D) ai-service 중지 → 분석 시작 → stream 401 → refresh 200 → stream HTTP 200 SSE `event:error` `statusCode` 503 `AI_UNAVAILABLE` → "분석 서버가 응답하지 않습니다"+다시 시도 · "생성 중..." 종료 · 노출 없음(HTTP 503 직접 응답 아님) · 깨진 JSON 로그인 400은 500 검증 아님 | 같은 절차(가로챈 응답) · 실제 HTTP 500 응답 본문은 B-8에서 확인 완료 · 실제 500 화면은 테스트 한정 Hikari 3000ms + DB 중지 + 새로고침 없이 필터(C) · 실제 AI 장애 화면은 ai-service 중지 후 분석 시작(D) — 2026-11-10 PASS | `F-7.txt` · `F-7.png` · `F-7-stream.png` · `F-7-lock.png` | T-039 |

## 발견 시 넘길 것
`발견` 행은 기술 리드에게 S-ID 부여 요청 → 조치 오너가 `fix(security): [S-0N] …` 커밋 → 내가 같은 명령으로 재확인해 위 칸에 적는다.

## F-1~F-7 상세 (T-039 · 2026-11-09)

**환경** — 기준 코드: `surim/frontend` · 사용자 보고 HEAD `bcc1eb2`(frontend 미커밋 변경 없음).
- 실행한 것:
  - 목 서버 `node mock/server.mjs 8090`
  - Vite 5174(`VITE_API_URL`은 환경변수로만 바꿈)
  - headless Chrome(CDP · `alert` 대화상자 감시)
  - vitest · `npm run build` · `npm audit`
- 최초 점검 때 실행 못 한 것: Docker 데몬 미기동으로 compose(nginx·backend·MariaDB)를 띄우지 못했다.
  - `./mvnw -o test`도 Maven 의존성이 로컬에 없어 실패했다(지금도 미실행).
- 추가 실서버 검증(2026-11-09 KST · Docker Compose `http://localhost/` · 사용자 직접 실행):
  - F-1 실제 CSP 응답 헤더(`/`) · F-3 실제 JWT 서명 변조 401 · F-6 실제 업로드 415·413·415.
  - 실제 백엔드 500은 승인된 재현 방법이 없어 실행하지 않았다(F-7). 깨진 JSON 로그인 400 `VALIDATION_ERROR`는 B-8 참고일 뿐 500 검증이 아니다. → 2026-11-10 B-8(T-063)에서 DB 일시 중지로 실제 HTTP 500 응답 확인(노출 0) · 브라우저 검증 A·B를 실행했으나 실제 HTTP 500을 수신한 문서 목록 화면은 관측하지 못함. → 같은 날 C(테스트 한정 Hikari 3000ms)에서 실제 500 화면 · D(ai-service 중지)에서 SSE event:error 503 화면 확인.
- 테스트 브라우저 안에서만 fetch를 가로채 쓴 경우(프로젝트 코드는 그대로):
  - XSS가 든 SSE 응답(F-1)
  - 500·503·502 응답과 스택이 든 `event: error`(F-7)
- 토큰 원문은 증거에 남기지 않았다(키 이름·접두·길이만).

| 행 | 기대 결과 | 판정 | 미검증 부분 → 후속 |
|---|---|---|---|
| F-1 | 제목·질문·응답의 HTML이 글자로 보이고 alert가 없다 · `javascript:` 출처는 링크가 아니다 · CSP 헤더가 있다 | PASS(화면 · 실제 CSP 헤더 `/`) | 선택: `/index.html`·`/documents`·`/assets/*.js` 헤더와 `/api/*` CSP(`default-src 'none'`)는 미실행 |
| F-2 | localStorage에 `refreshToken`·`user`만 있고 access는 메모리에만 있다 | PASS | `F-2.png`(DevTools 캡처)는 사람이 찍는다 |
| F-3 | 비로그인이면 `/login` · 가짜 refresh면 세션을 비우고 `/login` · 변조 토큰이면 서버 401 | PASS(프론트·목 · 실제 백엔드 정상 200 / 변조 401 `UNAUTHORIZED`) | `JwtProviderTest` 직접 실행은 미실행(Maven 의존성) |
| F-4 | dist에 키 형태가 0개 · `VITE_*`는 `VITE_API_URL` 하나 | PASS | — |
| F-5 | High 이상 0건 | PASS(0건) | — |
| F-6 | 화면이 먼저 막고 서버도 막는다(415·413·400) | PASS(클라이언트 · 목 · 실제 백엔드 `.exe` 415 · 300KB 413 · `.txt.exe` 415) | nginx 1MB 초과 413 · 실제 질문 1001자 400은 미검증 → B-10(T-063) |
| F-7 | 500·503·502·스트림 error 모두 사용자 문구로 보이고 스택·내부 주소가 없다 · 423은 해제 시각만 | 가로챈 응답 안전 렌더링 PASS · 실제 HTTP 500 응답 본문 확인 완료(B-8) · 실제 DB 장애 네트워크 오류 UI 확인(B · 약 10초 canceled) · 실제 HTTP 500을 받은 문서 목록 화면 PASS(C · 테스트 한정 Hikari 3000ms · 이 요청의 응답 본문은 미확인) · 실제 AI 장애 분석 화면 PASS(D · HTTP 200 SSE `event:error` 503 `AI_UNAVAILABLE` — HTTP 503 직접 응답 아님) | 업로드·삭제 중 HTTP 503 직접 응답 화면은 미실행 · refresh 500 처리는 아래 별도 검토 |

**발견 0건** — S-ID 요청할 것 없음. 남은 미검증: F-7 업로드·삭제 중 HTTP 503 직접 응답 화면(실제 500 화면·SSE 503 화면은 2026-11-10 C·D 확인) · F-6 nginx 1MB 413·실제 질문 1001자(→ B-10) · `F-2.png` 캡처.

**별도 검토(F-7 판정과 별개 · FE-화면 T-009 `frontend/src/api/client.js` · 기술 리드 전달)** — `refreshOrClear()`가 refresh 500·네트워크 오류에도 세션을 비워 `/login`으로 보낸다(401과 서버 장애 미구분) · refresh `fetch`에 타임아웃 없음(일반 요청 10초) · SPEC §4.1은 refresh 실패를 401 `INVALID_REFRESH_TOKEN`으로 정의하고 §4.4는 500의 사용자 표시 문구를 정의하지만, refresh 자체가 500·네트워크 오류로 실패할 때의 세션 처리 정책은 명시하지 않았다(docs/6 :117 "refresh 실패면 clear()"도 범위 모호) — 명세 간 충돌이 아니라 정책 공백·모호함으로, 정리 필요. 취약점 아님(가용성·사용성) · S-ID 여부는 기술 리드 판단 · 코드 수정 없음.

### 수동 확인 (사람이 할 것)

1. **F-2 캡처**
   - `node mock/server.mjs` + `cd frontend && npm run dev`를 띄운다.
   - `http://localhost:5173/login`에서 kim@example.com으로 로그인한다.
   - F12 → Application → Local Storage → `http://localhost:5173` → `jobgap-auth`를 연다.
   - 값 칸의 `refreshToken` 문자열은 가리고 캡처해 `security/evidence/F-2.png`로 저장한다.
   - 기대: 키는 `state.refreshToken`·`state.user`·`version`뿐이고 `accessToken`은 없다. Cookies·Session Storage는 비어 있다.
2. **F-1 CSP** — 완료(2026-11-09 · `F-1-csp.txt` 4)).
3. **F-3 실제 백엔드** — 완료(2026-11-09 · `F-3.txt` 4)).
4. **F-6 실서버** — 업로드 3건 완료(`F-6.txt` 3)). nginx 1MB 413은 B-10(T-063)에서 확인한다.
5. **F-7 실서버 500·503** — 완료(2026-11-10 · `F-7.txt` "실제 브라우저 검증 2"). HTTP 500 응답 본문은 B-8 · 화면은 C(테스트 한정 Hikari 3000ms · DB 중지 · 새로고침 없이 필터 → 500 → 사용자 문구) · AI 장애는 D(HTTP 200 SSE `event:error` 503 → 사용자 문구). 남은 것: 업로드·삭제 중 HTTP 503 직접 응답 화면(선택).

## B-1·B-8·B-10·B-11 상세 (T-063 · 2026-11-10)

**환경** — `surim/frontend` HEAD `6b1bc66`(origin/dev 반영) · backend 소스·판정 테스트·설정 수정 없음 · 컨테이너 재생성·재빌드 없음.
- compose(사용자가 기동): frontend(nginx, 호스트 80) · backend(healthy, 8080 호스트 미노출) · ai-service · database(MariaDB 10.11.10). 모든 요청은 `http://localhost/api/…`(nginx 프록시).
- 이미지가 최신 코드인지:
  - backend 이미지 2026-11-09 15:50 KST 빌드 · 그 뒤 `backend/`에 들어온 커밋: `58ac397`(Dockerfile HEALTHCHECK timeout 5s→10s) · `AnalysisService.java`(S-01·S-03).
  - 실행 중 jar에서 꺼낸 `.class` SHA-256을 오늘 HEAD 로컬 컴파일과 비교: `PageRequests` · `GlobalExceptionHandler` · `ApiResponse` · `DocumentService` · `DocumentController` · `AuthController` · `AuthDtos$RegisterRequest` **같음** · `AnalysisService` **다름**(이미지가 S-01·S-03 이전 — B 행 경로가 아님).
  - jar 안 `application.yml`의 multipart·`server.error` 값 = 저장소 · 컨테이너 nginx `default.conf` = 저장소(diff 없음).
  - → B-1·B-8·B-10·B-11이 거치는 코드는 최신과 같다. 분석 기능을 실서버로 볼 때는 재빌드가 필요(사용자 확인 뒤).
- 인증: 시드 계정 kim 로그인 accessToken(값 비기록). 데이터 영향: GET·거절되는 요청만 · kim 문서 수 2 → 2 · 가입은 전부 400이라 계정 생성 없음 · 삭제한 데이터 없음.
- Maven(2026-11-10 · 재실행 안 함): PageRequests 4 · GlobalExceptionHandler 6 · JwtProvider 6 green · MalformedJsonTest 1 ERROR(로컬 DB 연결 실패 `GSS-API authentication exception` — 환경 · 코드 결함 아님) · 17 run / 0 fail / 1 error · exit 1.

| 행 | 기대 결과 | 판정 | 남은 것 → 후속 |
|---|---|---|---|
| B-1 | 결합 grep 0 · sort 허용 목록 밖 400 봉투 | **PASS** | — |
| B-8 | 500 응답 본문에 `Exception`·`at com.` 없음 | **PASS**(정적·단위·실서버 4xx 7종 노출 0 · 실제 500(DB 일시 중지 · 16:29:34) JSON 봉투 · 내부 정보 노출 0) | `docs/9` B-8 문구 정정 완료(기술 리드 · 깨진 JSON은 400 · T-037) |
| B-10 | 300KB 413 봉투 · 1MB 초과 nginx 413 · `.exe`·`.html`·`.md.exe` 415 | **PASS** | — |
| B-11 | 가입 형식 오류 → 400 + `fields[]`에 그 필드 | **PASS** | DB 있는 환경에서 `AuthAcceptanceTest`·`BoundaryAcceptanceTest` (선택) |

**발견 0건** — FAIL·BLOCKED 없음. B-8 실제 500은 사용자가 개인 로컬 compose에서 DB를 일시 중지해 확인(2026-11-10 16:29:34 KST).
