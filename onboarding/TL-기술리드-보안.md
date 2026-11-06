# 레인 상세 명세 — 기술 리드·보안 (ydh)

> 정본은 `SPEC.md`. 이 문서는 "어떻게"다 — 다르면 SPEC이 이긴다. 티켓 원문(범위·수용 기준·확인 명령의 정본)은 `tasks/T-###-*.md`, 일정은 `tasks/BOARD.md`·`tasks/ROADMAP.md`.
> 이 레인은 **계약의 주인 + 보안 레인**이다(SPEC §8). FE-분석과 분담: S-01 재현(T-062)·원장 F-1~F-7·B-1·B-8·B-10·B-11 점검·기록은 FE-분석(`security/rows/FA.md`), 원장 취합·9번은 나,
> 분석 화면의 응답 안전 렌더(`ReportText`·`SourceChips` · T-054)도 나. 남의 기능 코드를 대신 짜지 않는다(예외: S-03 연결 호출 1줄 × 2 — BE-기능 리뷰 · T-028).

**내 브랜치·흐름** (근거: `onboarding/GitHub규약.md` §1·§3 · SPEC §1 커밋·브랜치 행)
- 내 브랜치 `feature/security` — 나 혼자 쓴다. 티켓마다 새 브랜치를 만들지 않는다(재현용 `demo/S-0N`만 임시 · 통합 브랜치에 병합 안 함). 필수 리뷰·승인·CODEOWNERS 없음.
- 작업 전 `git pull origin feature/security` → 커밋 → push 전 `node seams/check-scope.mjs <내 티켓> origin/feature/security` 무출력(둘이면 `T-016,T-017`)
- push 전 `git diff --stat origin/feature/security...HEAD`로 본 코드(`backend/src/main` · `frontend/src` 비테스트) 150줄 이하 확인 — 넘으면 티켓을 쪼갠다
- PR `feature/security → dev`(그 PR의 티켓 전부를 쉼표로 check-scope · 기준 기본값 `origin/dev`) → 통합 확인 뒤 `dev → main`

## 0. 판정 테스트 표

| 테스트 (실제 파일) | 내용 | 티켓 | D1 상태 |
|---|---|---|---|
| `acceptance/SecurityAcceptanceTest` 3 — `actuator` | `/actuator/health` 토큰 없이 200 · USER 토큰 `/actuator/metrics` 403 봉투 | T-005·T-016 | green 목표 |
| — `tokens` | 토큰 없음 401 `UNAUTHORIZED` · 만료 401 `TOKEN_EXPIRED` · 위조 401 `UNAUTHORIZED` — 전부 봉투 | T-005·T-016 | green 목표 |
| — `headersAndErrors` | API 응답 CSP `default-src 'none'` · 없는 경로 404 봉투 | T-005·T-016 | green 목표 |
| `security/PiiMaskerTest` 6 | 네 종 마스킹·개수 · 일반 텍스트 보존 · 한글 인접 · 생년월일 문맥 · 200KB 1초 · 로그용 이메일 `k***@e.com` | T-017 | green 목표 |
| `acceptance/DocumentAcceptanceTest` ③ `upload_masksAndIngests` | ingest 본문에 내 uuid · [S-03] 마스킹본만 · `maskedCount` | **T-028** (S-03) | red |
| `acceptance/BoundaryAcceptanceTest` `titlesAreMasked` · `questionIsMasked` ([T-028]) | 업로드·수정 제목 마스킹 저장 · 마스킹 뒤 같아진 제목 409(500 아님) · 후속 질문 마스킹(DB USER 메시지·AI question 둘 다) | **T-028** (S-03) | red |
| 단위 `security/JwtProviderTest` 6 | 왕복·HS256 · 만료 `TOKEN_EXPIRED` · 위조·변조 `UNAUTHORIZED` · alg none 거부 · 32바이트 미만 secret 거부 · refresh 43자·SHA-256 64자 | T-005 | green |
| 단위 `common/PageRequestsTest` 4 | page<0·size<1 400 · size 50 절단 · 정렬 기본값·허용 4조합 · 허용 밖 400 | T-005 | green |
| 단위 `common/ApiResponseJsonTest` 5 | 성공·에러 봉투 키 · data null 키 유지 · `+09:00` ISO 문자열 · ErrorCode 상태 = SPEC §4.4 | T-005 | green |
| 회귀 `common/GlobalExceptionHandlerTest` 6 | UNIQUE email→409 `DUPLICATE_EMAIL` · (owner,title)→409 `DUPLICATE_TITLE` · 그 밖 무결성 500 · Accept 협상 400 · 바인딩 400 · `@PreAuthorize` 403 + AUDIT | T-005 | green |
| 회귀 `security/CorsConfigTest` 2 | `CORS_ALLOWED_ORIGINS`에 `*` → 기동 예외(B-7) · 쉼표 목록 파싱·`/api/**`만 | T-016 | green |
| 회귀 `security/PiiMaskerEdgeTest` 7 | 휴대폰 구분자·+82 · 한글 인접 점 · 일반 숫자 보존 · 주민번호 YYMMDD · '생성·생산…' 제외 · 서로게이트 절단 금지 · 마스킹 뒤 상한 | T-017 | green |
| `frontend/src/pages/analysis/ReportText.test.jsx` 4 | 제목·표·목록을 요소로 · 응답 속 HTML은 글자로(표 칸 포함 · F-1) · 덜 온 마크다운도 글자 보존 · SourceChips doc/web 구분 · http(s)만 새 탭 링크(`noopener noreferrer`) | T-054 | red(컴포넌트 없음) |
| 나머지 전 레인 판정 테스트 | 작성자 = 나 · 수정 권한도 나만 | — | — |

단위·회귀 6클래스(위 `JwtProviderTest`~`PiiMaskerEdgeTest`)는 DB 없이 돈다. 테스트 이름의 [T-###]가 담당 티켓 — `BoundaryAcceptanceTest`에서 내 것은 [T-028] 둘뿐.

**CI 1단계(필수 · `.github/workflows/ci.yml`)** — 내 테스트가 대부분이다:
- backend: `mvn -B test -Dtest='JobgapApplicationTests,PiiMaskerTest,PiiMaskerEdgeTest,GlobalExceptionHandlerTest,CorsConfigTest,JwtProviderTest,PageRequestsTest,ApiResponseJsonTest'`
- frontend: `npm run build && npx vitest run src/api src/components`(공용 + 회귀 `session.test.js` 13 · `ErrorMessage.test.jsx` 5) — `ReportText.test.jsx`는 `src/pages`라 2단계
- ai: `pytest -q tests/test_hardening.py tests/test_contract.py -k "hardening or health or require_token"`
- 2단계(`mvn -B test` · `npm test` · `pytest -q`)는 `continue-on-error: true` 세 줄 — D5 저녁 T-049 뒤에 지운다(§3 T-048 · §5).

판정 테스트를 고쳐 달라는 요청이 오면: ① SPEC 문장과 대조 → SPEC이 맞으면 구현이 고친다 ② SPEC이 틀렸으면 SPEC PR(팀장·영향 담당에게 공유·확인 — SPEC §9 · 필수 승인 없음) → 같은 PR에서 테스트·목·검사를 고친다.

## 1. 완료 정의 (D5 저녁 동결 시점)

- [ ] `SecurityAcceptanceTest` 3 · `PiiMaskerTest` 6 · 단위·회귀 6클래스 green · `DocumentAcceptanceTest` ③ · `BoundaryAcceptanceTest` 마스킹 2 green · `ReportText.test.jsx` 4 green
- [ ] `security/LEDGER.md` 31행 결과 칸 전부(발견·미발견·해당 없음·미조치 중 하나) + 점검 방법 칸이 실제 실행한 명령 (FE-분석 행은 `security/rows/FA.md`에서 옮김)
- [ ] `fix(security): [S-0N]` 커밋 S-01(BE-기능)·S-02(팀장)·S-03(나)(+예비 발견 시 S-04) · 각 `security/evidence/S-0N/`에 재현·재확인 증거
- [ ] `security/evidence/bom.json`(내 것 · T-034) · `security/evidence/npm-audit.json`(FE-분석 T-039 — 있는지만 확인)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력 · `node scripts/check-rubric-p3.mjs` 무출력(사람 판정 행은 `--human` 캡처)
- [ ] 9번 보안점검서 전부 · 2번 6절 · 5번 5절 커밋 · `docs/9-` TODO 0
- [ ] CI 2단계 전환(팀장 T-049 · D5 저녁) 뒤 판정 테스트가 필수 단계에서 green인지 확인

## 2. 내 파일

| 경로 | 역할 | 티켓 |
|---|---|---|
| `SPEC.md` · `CLAUDE.md` | 계약·작업 경계(T-001 산출) | T-001 (이후 변경은 SPEC §9) |
| `tasks/` · `onboarding/` · `onboarding/GitHub규약.md` | 최초 작성만 나(T-001) — **이후 오너는 팀장**(SPEC §10 "티켓·역할·D1 순서" 행 · GitHub규약은 T-002) | T-001 |
| `mock/server.mjs` · `seams/check-api.mjs` · `seams/check-ai.mjs` · `seams/check-scope.mjs` · `seams/smoke.md` | 첫째 seam 목·검사 · 둘째 seam 검사 · 경계 검사 · 화면 눈 검사 | T-001 (`ai-module/mock_app.py`는 AI 오너 — SPEC §10) |
| `scripts/check-sec-deploy.mjs` · `scripts/check-rubric-p3.mjs` | 정적 보안 게이트 · 평가표 게이트(스킬 사본 — 고치지 않는다) | T-001 |
| `backend/**/common/` | ApiResponse · PageResponse · ErrorCode · BusinessException · GlobalExceptionHandler · PageRequests | T-005 · T-016 |
| `backend/**/security/` | SecurityConfig(필터 체인 · CSP · **CORS `corsConfigurationSource`** · PasswordEncoder) · JwtProvider · JwtProperties · JwtAuthenticationFilter · RestAuthenticationEntryPoint · RestAccessDeniedHandler · SecurityResponses · AuditLog · SecurityAuditListener · PiiMasker · AuthUser | T-005 · T-016 · T-017 · T-028 |
| `frontend/src/pages/analysis/ReportText.jsx` · `SourceChips.jsx` | 분석 화면 응답 안전 렌더(F-1 방어선) | T-054 — **만들 것**(지금 리포에 없음) |
| `backend/src/test/**` · `frontend/src/**/*.test.js(x)`(판정분) · `ai-module/tests/` | 판정·단위·회귀 테스트 | T-001 · T-005 |
| `DocumentService.java` · `AnalysisService.java`(BE-기능 파일) | PiiMasker 호출 1줄씩만 | T-028 |
| `security/LEDGER.md` · `security/evidence/` · `security/ACCEPTED.txt` | 원장·증거(`security/rows/FA.md`는 FE-분석 — 읽기만) | T-028 · T-033 · T-034 · T-048 · T-051 |
| `docs/9-*` 전부 · `docs/2-*` 6절 · `docs/5-*` 5절 | 문서 | T-034 · T-048 · T-016 |

## 3. 티켓별 구현 명세

각 절: 선행 · 수정 허용(티켓 그대로) · 수용 기준 요지 · 확인 명령(티켓 그대로) · 구현 지침. 모든 티켓 공통 수용 기준 셋은 생략하지 않는다 —
`node scripts/check-sec-deploy.mjs` 무출력 · `node seams/check-scope.mjs T-###` 무출력 · 본 코드 diff 150줄 이하.

### T-001 설계 정본·목 서버 둘·seam 검사·판정 테스트·원장·역할 문서 (D1 · 선행 —)
- 수정 허용: `SPEC.md` · `CLAUDE.md` · `mock/` · `seams/` · `scripts/` · `security/` · `tasks/` · `onboarding/` · `docs/` · `.github/` · `worklog/`
- 수용 기준: `node mock/server.mjs` + `node seams/check-api.mjs http://localhost:8080` green 20줄 · 이미 완료 — 이후 이 파일들의 변경은 SPEC §9 규약
- 확인 명령:
```bash
node scripts/check-sec-deploy.mjs
```
1. 커밋 후 `node mock/server.mjs` + `node seams/check-api.mjs http://localhost:8080` 20줄 green · AI 목은 `cd ai-module && uvicorn mock_app:app --port 8000` + `node seams/check-ai.mjs http://127.0.0.1:8000`
2. D1 저녁 동결 회의(팀장 T-003 진행): 내가 SPEC §2·§4·§6 10분 낭독 → 질문은 "고친다/그대로" → 고치면 내가 즉시 PR → 팀장 승인 → SPEC 머리 `동결 v1 · 2026-11-05`

### T-005 공통·보안 패키지·판정 테스트 첫 컴파일 대응 (D1 · 선행 T-004)
- 수정 허용: `backend/src/main/java/com/jobgap/common/` · `backend/src/main/java/com/jobgap/security/` · `backend/src/test/`
- 수용 기준: `SecurityAcceptanceTest`·`PiiMaskerTest` green · 판정 테스트 전체가 컴파일된다(red는 정상)
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest='SecurityAcceptanceTest,PiiMaskerTest'
```
- 팀장 T-004(Maven wrapper) 커밋 직후가 **처음 컴파일되는 순간**. 에러는 내 패키지면 내가, 남의 골격이면 그 레인과 같이 본다.
- 같은 날 CI 1단계 backend 목록(§0)이 green인지 — 단위·회귀 6클래스는 DB 없이 돈다.

### T-016 보안 설정 실서버 관측 · 5번 5.2 CSRF 사유 (D2 · 선행 T-005)
- 수정 허용: `backend/src/main/java/com/jobgap/security/` · `backend/src/main/java/com/jobgap/common/` · `docs/5-*` · `SPEC.md`
- 수용 기준: JWT alg = HS256 · `/actuator/health` 200 · USER 토큰 `/actuator/metrics` 403 · CSP 헤더 — 결과를 SPEC §1 표 옆에 · `docs/5-` 5.2 CSRF 사유 문장(내 절 = 내 커밋)
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest=SecurityAcceptanceTest
```
- 실서버(`./mvnw spring-boot:run` + `.env` 값)에서 관측하고 SPEC §1 표 아래 "관측 명령" 줄 옆에 결과 한 줄씩:
  - JWT alg: `node -e 'console.log(JSON.parse(Buffer.from(process.argv[1].split(".")[0],"base64url")).alg)' "$TOKEN"` → `HS256`
  - 헬스: `curl -s localhost:8080/actuator/health` 200 · USER 토큰으로 `/actuator/metrics` 403 봉투
  - CSP: `curl -sI localhost:8080/actuator/health | grep -i content-security`
- 5번 명세 5.2 CSRF 행은 초안이 이미 있다 — `SecurityConfig` 주석 문장과 같은지 대조해 맞춘다. **T-044(D5) 전에 열리는 내 티켓 중 `docs/5-*` 수정 허용은 이것뿐**(T-001은 완료 · T-051 `docs/`는 D6)이므로,
  5절의 남은 `TODO(D3·기술 리드)`(§5.3 감사 로그 `B-9-audit.txt` 링크)와 §9 `TODO(D4·기술 리드)`(SBOM 요약)도 증거가 생긴 뒤 `[T-016]` 커밋으로 닫는다 — 팀장 T-044(`grep -c 'TODO(' docs/5-*` = 0)가 파일 전체를 센다.
- `CorsConfigTest`([T-016])가 green이어야 한다.

### T-017 PiiMasker 단위 테스트 고정 (D2 · 선행 T-005)
- 수정 허용: `backend/src/main/java/com/jobgap/security/PiiMasker.java` · `backend/src/test/java/com/jobgap/security/`
- 수용 기준: `PiiMaskerTest` 6 green · 연결하지 않은 상태로 둔다(S-03 조치 전 확보)
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest=PiiMaskerTest
```
- 완성본 + 테스트 green 확인만(`PiiMaskerEdgeTest` 7도 [T-017]). **업로드에 연결하지 않는다** — S-03의 "조치 전" 상태가 이력에 있어야 한다(연결은 T-028).

### T-054 응답 안전 렌더 `ReportText`·`SourceChips` → FE-분석에 넘김 (D2 · 선행 T-009)
- 수정 허용: `frontend/src/pages/analysis/ReportText*` · `frontend/src/pages/analysis/SourceChips*`
- 수용 기준: `npx vitest run src/pages/analysis` 4 passed · FE-분석에게 import 방법 공유
- 확인 명령:
```bash
cd frontend && npx vitest run src/pages/analysis
```
- 근거: SPEC §5 분석 화면 줄("응답은 `ReportText`로 렌더 — 제목·표·목록만 요소로, HTML은 글자로 · HTML 주입 API 금지") · §4.3 리포트 형식(`## 요구 기술` 표 → `## 준비 순서` 목록 → `## 기업 최신 정보`) · §4.3 sources 모양 · 점검서 F-1.
- 만들 것(지금 `pages/analysis/`에는 `AnalysisPage.jsx`와 테스트뿐):
  - `ReportText.jsx` — `export default` · props `{ text }` · 마크다운 일부(`#` 제목 · `|` 표(구분선 `|---|`은 행이 아님) · `1.`/`-` 목록 · 문단)를 React 요소로 · 나머지는 전부 JSX 텍스트. 스트리밍 중 덜 온 줄도 글자를 버리지 않는다.
  - `SourceChips.jsx` — `export default` · props `{ sources }`(`[{type:'doc',documentId,docType,chunk,score} | {type:'web',url,title}]`) · doc/web 구분 · 웹은 `http:`/`https:`일 때만 `<a target="_blank" rel="noopener noreferrer">` · 그 밖 스킴은 링크 없이 제목만.
- 테스트 4개(`ReportText.test.jsx`)는 이미 있고 컴포넌트가 없어 red — 구현하면 green.
- **함정**: `check-sec-deploy` F-1 검사는 `.js(x)` 파일에서 그 HTML 주입 API 이름을 **줄 단위 문자열로** 센다 — 주석에 적어도 RED. 테스트 파일도 그래서 이름을 적지 않았다.
- FE-분석에게 넘길 사용법(FE-분석 문서 §3.3과 같은 줄): `import ReportText from './ReportText.jsx'` · `import SourceChips from './SourceChips.jsx'` · `<ReportText text={m.content} />  <SourceChips sources={m.sources} />`
- 커밋: `feat(fe): 응답 안전 렌더 ReportText·SourceChips — F-1 방어 [T-054]`

### S-02 재현 (D3 · T-027 머지보다 먼저 · 증거 커밋은 T-034 범위) — S-01은 FE-분석(T-062)
SPEC §7: 재현은 기술 리드가 한다(단 S-01·F-1은 FE-분석). 조치 전 커밋 = 팀장 T-015(잠금 없음)가 머지된 시점.
- S-02: Burp Intruder · `POST /api/auth/login` · 존재 계정(시드 kim) password 위치 페이로드 10개 · 결과 표(전부 401, 잠금 없음) 캡처 `security/evidence/S-02/intruder-before.png` · 조치 전 커밋 해시 기록
- 재현 끝났다고 채널에 → 팀장이 T-027 머지 → **같은 요청으로 재확인**: `intruder-after.png`(6번째부터 423 `ACCOUNT_LOCKED` + 해제 시각) · 감사 로그 `LOCK account=k***@e.com` 줄
- `security/evidence/S-02/`는 **T-034 수정 허용**에만 있다 — 캡처는 D3에 만들고 커밋은 `[T-034]`로(다른 티켓 번호로 올리면 check-scope RED).
- S-01은 FE-분석이 onboarding/FA §9.1 명령으로 재현한다(T-062 · 증거 `security/evidence/S-01/`). 나는 `before.json`이 200인지 · BE-기능 T-026이 그 뒤에 머지됐는지만 확인

### T-028 [S-03] 업로드·제목·질문 PiiMasker 연결 + 감사 로그 캡처 (D3 · 선행 T-017 · T-024)
- 수정 허용: `backend/src/main/java/com/jobgap/security/` · `security/evidence/S-03/` · `security/evidence/B-9-audit.txt` · `backend/src/main/java/com/jobgap/document/DocumentService.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisService.java` (BF 파일은 호출 1줄씩만 — BF 리뷰)
- 수용 기준: 조치 전 `security/evidence/S-03/before.json` · `DocumentAcceptanceTest` ③ green · `BoundaryAcceptanceTest` `titlesAreMasked`·`questionIsMasked` green(제목은 마스킹 뒤 중복 검사 · 질문은 DB·AI 둘 다) · 감사 로그 4줄 `security/evidence/B-9-audit.txt`
- 확인 명령:
```bash
cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,BoundaryAcceptanceTest#titlesAreMasked+questionIsMasked'
```
1. 재현(조치 전): `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` → 가짜 연락처 든 이력서 업로드 →
   AI 목/실물 로그(`/internal/ingest` 요청 본문) 또는 `GET /api/documents/{id}` 응답에 `010-1234-5678` 원문 → `S-03/before.json`
2. 조치 — `DocumentService`(업로드 본문·제목 · 제목 수정) · `AnalysisService`(질문) 호출 한 줄씩(SPEC §1 질문·제목 행 · §6.5):
```java
var masked = PiiMasker.mask(text);            // 업로드: 디코딩 직후, 저장·ingest 전
// BF가 만든 Document 생성 코드에 원문 대신 넘긴다: 제목 PiiMasker.maskAndTrim(title, 100).text() · 본문 masked.text() · 개수 masked.count()
String question = PiiMasker.maskAndTrim(req.question(), 1000).text();   // 스트림: USER 저장·AI 전송 전
```
   제목 중복 검사는 마스킹한 값으로(마스킹 뒤 같아지면 409 — 동시 요청은 `GlobalExceptionHandler`가 `uk_documents_owner_title`을 409로).
3. 커밋: `fix(security): [S-03] 업로드·제목·질문 PiiMasker 연결 · A-3 [T-028]` · BF 리뷰
4. 재확인: 같은 업로드 → `maskedCount: 2` · `S-03/after.json` · `DocumentAcceptanceTest` ③ green
5. 감사 로그 4줄 캡처(`LOGIN_SUCCESS` · `LOGIN_FAILURE` · 401 · 403 — 이메일이 `k***@e.com`) → `security/evidence/B-9-audit.txt`

### T-033 저녁 평가표 게이트 → MISS를 D4~D5 티켓으로 (D3 저녁 · 선행 T-032)
- 수정 허용: `security/evidence/rubric-D3.txt` · `tasks/`
- 수용 기준: `security/evidence/rubric-D3.txt` · MISS마다 담당·티켓 · 새 티켓은 팀장 승인
- 확인 명령:
```bash
node scripts/check-rubric-p3.mjs > security/evidence/rubric-D3.txt
```
- DevOps T-032(compose 1차 통합) 뒤 실행 → MISS 줄마다 담당 레인·티켓을 붙여 팀 채널에. 이미 티켓이 있는 MISS는 그 티켓으로, 없으면 새 티켓 파일(팀장 승인 · `- 수정 허용:` 줄 필수).
  이 파일이 팀장 T-040(D4 아침 자르기 결정)의 입력이다.

### T-034 동적 점검일 — 원장 취합 (D4 · 선행 T-026 · T-027 · T-028)
- 수정 허용: `security/LEDGER.md` · `security/evidence/S-02/` · `security/evidence/B-3*` · `security/evidence/B-4*` · `security/evidence/B-6*` · `security/evidence/B-7*` · `security/evidence/B-12*` · `security/evidence/B-13*` · `security/evidence/B-14*` · `security/evidence/A-*` · `security/evidence/I-*` · `security/evidence/sec-deploy.txt` · `security/evidence/bom.json` · `docs/9-*`
- 수용 기준: 원장 31행 결과 칸(FE-분석 행은 `security/rows/FA.md`에서 옮김) · `security/evidence/bom.json` · `node scripts/check-rubric-p3.mjs` R-SE10~12 green
- 확인 명령:
```bash
node scripts/check-rubric-p3.mjs | grep R-SE
```
오전: 자동·빠른 것 → 오후: 서버 띄운 동적 점검 → 저녁: `rows/FA.md` 옮기기 · 원장 31행 · 9번 초안.

| 행 묶음 | 방법(점검 방법 칸에 그대로) | 증거 |
|---|---|---|
| B-1 · B-8 · B-10 · B-11 · F-1~F-7 | **FE-분석(T-063 · T-039)** — `security/rows/FA.md`에서 옮긴다(F-5 npm audit 포함) | FE-분석의 `B-*.txt`·`F-*`·`npm-audit.json` |
| B-2 | S-01 — FE-분석 재현(T-062 · `rows/FA.md` S-01 절) · 조치 BE-기능 T-026 | `S-01/` |
| B-5 | S-02(나 · 위 S-02 재현) · 조치 팀장 T-027 | `S-02/` |
| B-3 · B-4 | 만료·위조 토큰 401(SecurityAcceptanceTest 출력) · DB `refresh_token_hash` 64자 · 재발급 후 이전 refresh 401 · 로그아웃 후 401 | `B-3.txt` · `B-4.txt` |
| B-6 | 쿠키 인증 0 (`grep -rn Cookie backend/src/main` 0) + 사유 문장(SPEC §1) | `B-6.txt` |
| B-7 · I-1 · I-4 | `node scripts/check-sec-deploy.mjs` 무출력 · USER 토큰 `/actuator/metrics` 403 · CORS Origin | `sec-deploy.txt` · `I-*` |
| I-3 | 외부 포트 — DevOps T-042(D5) 캡처 `I-3-ec2-80.txt`·`I-3-ec2-closed.txt`를 **T-048(D5)에서** 원장에 옮긴다(D4엔 아직 없다) | DevOps 증거 |
| B-9 | 감사 로그 4줄(T-028에서 만든 것) | `B-9-audit.txt` |
| B-12 | `SELECT LEFT(password_hash,4) FROM users` → `$2a$` | `B-12.txt` |
| B-13 | `cd backend && ./mvnw org.cyclonedx:cyclonedx-maven-plugin:makeAggregateBom && cp target/bom.json ../security/evidence/bom.json` — High 이상이면 `발견` → 버전 올림 커밋도 `fix(security):` | `bom.json` |
| B-14 · I-5 | 해당 없음(직렬화 값을 받는 경로 없음 · K8s 미적용 — 적용하면 DevOps와 재점검) — 원장에 이미 기입 | — |
| A-1 | dev 아닌 compose에서 호스트 `curl -m 3 localhost:8000` 실패 · 토큰 없는 내부 호출 401(check-ai) | `A-1.txt` |
| A-2 | AI 레인 T-036 결과를 옮긴다 | AI의 증거 |
| A-3 | S-03 + check-ai owner 필터 행 green | `S-03/` |
| A-4 | 1001자 질문 400 · (Rate limit 없음 → `미조치`, §7 잔여 위험) | `A-4.txt` |
| A-5 · I-2 | compose 서비스별 env(LLM 키는 ai-service만) · 비root(uid 1001)는 DevOps 증거 `I-2-nonroot.txt`(T-042)를 옮긴다 — 같은 점검을 두 파일로 만들지 않는다 | `A-5.txt` · DevOps `I-2-nonroot.txt` |

원장 한 행 예: `| B-2 | Burp Repeater: kim 토큰으로 GET /api/documents/3 → 200 (a1b2c3d) | 발견 | e4f5g6h | 같은 요청 → 403 봉투 + AUDIT 로그 | evidence/S-01/ | S-01 |`
- 커밋: `docs(security): 원장 31행 · 동적 점검 증거 [T-034]`

### T-048 게이트 무출력 · 9번 본문 (D5 · 선행 T-034)
- 수정 허용: `docs/9-*` · `security/` · `docs/2-*`
- 수용 기준: `check-rubric-p3` 무출력 · `--human` 캡처 · `check-sec-deploy` 무출력 · `docs/9-` TODO 0
- 확인 명령:
```bash
node scripts/check-rubric-p3.mjs && node scripts/check-sec-deploy.mjs
```
- `node scripts/check-rubric-p3.mjs --human > security/evidence/rubric-human.txt` — 사람 판정 행 캡처가 문서에 있는지 하나씩
- 9번: 원장 31행 → §2~§5 표 · S-ID → §6(재현 커밋 해시 · 조치 커밋 · 재확인) · 잔여 위험 §7(SPEC §7 목록)
- `git log --oneline --grep='\[S-0'`의 S-ID 종류 수 = 9번 §6 건수
- 2번 6절(보안 아키텍처 — 신뢰 경계 · 인증·인가 · 비밀정보)도 이 티켓(`docs/2-*`)으로. §6.4의 GitHub Secrets TODO는 DevOps 몫.
- CI 2단계: 팀장이 T-049(D5 저녁)에서 `ci.yml`의 `continue-on-error: true` 세 줄을 지운다(T-049 수정 허용 · DevOps 확인). 나는 그 뒤 2단계 판정 테스트 결과만 확인한다.

### T-051 보안 시연 리허설 · 제출 D-1 게이트 (D6 · 선행 T-048)
- 수정 허용: `security/` · `docs/`
- 수용 기준: 스킬 submission-docs-p3 §3 9항목
- 확인 명령:
```bash
node scripts/check-rubric-p3.mjs && node scripts/check-sec-deploy.mjs
```
- 보안 시연 순서 고정(5분 · 팀장 T-050 발표 표의 시연 단계): S-01 Burp Repeater(전·후) → S-02 Intruder(전·후) → S-03 마스킹 전후 JSON 한 장 → 원장 셈(발견 n · 조치 n · 잔여 n)
- 제출 D-1 게이트: 스킬 `references/submission-docs-p3.md` §3 9항목 · 통과 뒤 `main`에 태그 `v1.0`(GitHub규약 §8)

## 4. 받는 것·주는 것

| 상대 | 받는 것 | 주는 것 | 언제 |
|---|---|---|---|
| 팀장(BE-인증) | T-004 골격 커밋(컴파일) · T-015(조치 전) · T-027 잠금 · 9번 B-4·B-5 조치 문장 재료(D4) · T-037의 `common/GlobalExceptionHandler` 매핑 줄(공유·확인) | JwtProvider·PasswordEncoder·감사 리스너 · S-02 재현 완료 알림 · rubric-D3(T-040 입력) | D1 · D3 · D5 |
| BE-기능 | T-012 시드 시각 관측값(SPEC §1 관측 줄 · T-016) · T-014 머지(조치 전) · T-024(`dev` 머지 = T-028 시작 신호) · T-026 | PageRequests·ErrorCode · S-03 연결 리뷰 요청 | D2~D3 |
| AI | A-2 결과(T-036) | check-ai · AI 판정 테스트 | D4 |
| FE-분석 | S-01 재현(T-062 · D3) · F-1~F-7(T-039) · B-1·8·10·11(T-063) → `security/rows/FA.md`(D4) | `ReportText`·`SourceChips`(T-054 · D2) · 판정 테스트 | D2·D4 |
| FE-화면 | F-1 재현 대상 화면(내 문서 제목) | 판정 테스트 · ErrorMessage 문구 표(§4.4) | D3~D4 |
| DevOps | T-008 관측값(temurin curl 유무 · SPEC §1 관측 줄에 내가 적음) · 외부 포트·비root 캡처(T-042 · D5) · CSP 헤더 · compose 1차 통합(T-032 → T-033) | I-행 점검 방법 · `check-sec-deploy` | D3~D5 |
| 팀장 | 동결 승인(T-003) · 자르기 결정(T-040) | 게이트 결과(D3·D5) · 보안 시연 5분 | D1·D3·D5 |

리뷰 규칙(선택 — 필수 승인은 없다 · GitHub규약 §3·§4): seam 파일·보안 파일·판정 테스트 변경은 나에게 공유·확인(SPEC §9). 그 밖은 필요하면 부오너(SPEC §8)에게 요청. 내 부오너는 DevOps.

## 5. 일정 (BOARD · ROADMAP 날짜 기준)

| 날 | 오전 | 오후 | 저녁 |
|---|---|---|---|
| D1 11/5 목 | T-001 커밋 · 팀원 환경 확인 | T-005 BE 첫 컴파일 대응 · 목 서버 시연 | **SPEC 동결**(T-003 낭독) |
| D2 11/6 금 | T-016 관측 | T-017 · T-054 · 리뷰 | `check-sec-deploy` 1회 |
| D3 11/9 월 | S-02 재현(조치 전) · S-01 재현 확인(FE-분석 T-062) | T-028 · S-02 재확인(T-027 뒤) | T-033 rubric |
| D4 11/10 화 | T-034 동적 점검(자동 행) | T-034 동적 점검(Burp·컨테이너) | `rows/FA.md` 옮기기 · 원장 31행 · 9번 초안 |
| D5 11/11 수 | T-048 9번 본문 | EC2 외부 포트 재확인(DevOps T-042와) | 게이트 무출력 · CI 2단계(팀장 T-049) 뒤 판정 결과 확인 · 동결 |
| D6 11/12 목 | T-051 시연 리허설 | 제출 D-1 게이트 | — |

고정 일정(ROADMAP): D1 저녁 SPEC 동결 · D3 1차 통합 · D4 동적 점검일 · D5 저녁 기능 동결 · D6 리허설 2회 · 11/13 금 제출·발표.

## 6. 막힐 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| 모든 요청 401인데 토큰은 맞다 | JWT 필터가 체인 밖에서 먼저 돌았다 | `jwtFilterRegistration` 빈(setEnabled false)이 있는지 |
| 스트림 끝에 AccessDenied 로그 | ASYNC 디스패치 인가 | `dispatcherTypeMatchers(ASYNC, ERROR).permitAll()` 위치 |
| `/actuator/health` 401 → frontend 안 뜸 | permitAll이 ADMIN 줄보다 아래 | 순서 |
| 스트림 403이 봉투가 아니라 빈 응답 | Accept: text/event-stream 협상 | `respond()`의 `contentType(APPLICATION_JSON)` 유지 |
| 스트림이 300s에 안 끊긴다고 보고 | Spring async 300s는 Flux SSE에 걸리지 않는다 | 스트림 상한은 AiClient `Flux.timeout(290s)` 하나(nginx 310s) — SPEC §1 SSE 행 |
| `check-sec-deploy` F-1 RED인데 코드엔 안 썼다 | 주석·문자열에 HTML 주입 API 이름 | 이름 자체를 지운다(줄 단위 문자열 검사) |
| 재현하려는데 이미 조치가 머지됨 | 커밋 순서 | `git switch -c demo/S-0N <조치 전 해시>`에서 재현하고 9번에 "방어 해제 브랜치에서 재현" 그대로 적기 |
| `check-sec-deploy` 이력 RED(키) | 누가 키를 커밋했다 | **발급처에서 키 폐기·재발급 먼저** → I-1 조치 칸에 폐기 일시 → `security/ACCEPTED.txt` |
| check-scope RED인데 내 파일이 아니다 | 기준을 `origin/dev`로 돌림 | push 전에는 `origin/feature/security` 기준 |

## 7. 내 문서 절

| 문서 | 절 | 티켓 | 정본 |
|---|---|---|---|
| 9-보안점검서 | 전부(§2~§5 표 · §6 S-ID · §7 잔여 위험) | T-034(초안) · T-048(본문) · T-051 | `security/LEDGER.md` · `security/rows/FA.md` · `git log --grep='\[S-0'` · `security/evidence/` |
| 2-시스템아키텍처 | 6절 보안 아키텍처 | T-048 | SPEC §1 인증·포트 · compose 망 3 · AI 내부 토큰 |
| 5-Backend명세 | 5절 보안 구현(5.2 CSRF 사유 · 5.3 감사 로그 링크) · §9 SBOM 요약 TODO | T-016 | SecurityConfig 주석(CSRF 사유) · JwtProvider · PiiMasker · AuditLog · `bom.json` |
| SPEC.md | §1 관측 결과 줄(내 관측 + BE-기능 T-012 시드 `+09:00` · DevOps T-008 curl 유무를 받아 함께) | T-016 | 실서버 관측 출력 |

## 8. 코딩 에이전트 지시서 예시 (T-028 조치 부분)

```
[배경] SPEC.md §1 질문·제목 행 · §6.5 마스킹 표 · ADR-04 · §7 S-03. PiiMasker는 backend/src/main/java/com/jobgap/security/PiiMasker.java에 완성돼 있다.
[목표] 업로드 본문·문서 제목·질문을 저장·AI 전송 전에 PiiMasker.mask() / maskAndTrim(값, 100/1000)으로 바꾼다.
[수용 기준] DocumentAcceptanceTest ③ green · BoundaryAcceptanceTest titlesAreMasked·questionIsMasked green · AnalysisAcceptanceTest 전부 그대로 · 마스킹 개수는 documents.masked_count에
[제약] 수정 허용: DocumentService.java의 업로드·제목 경로 한 줄씩 · AnalysisService.java의 질문 저장 직전 한 줄. 다른 줄·다른 파일 금지.
       판정 테스트 수정 금지 · commit 금지 · 전면 재작성 금지
[확인 명령] cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,BoundaryAcceptanceTest#titlesAreMasked+questionIsMasked'
```

## 10. 내 티켓 전체 (최신 · `tasks/` 생성본 — 위 절과 번호가 다르면 이 표가 이긴다)

150줄 규칙으로 쪼갠 것: 새 **T-054**(응답 안전 렌더)

| 날 | 티켓 | 할 일 | 선행 |
|---|---|---|---|
| D1 | [T-001](../tasks/T-001-spec-gates.md) | 설계 정본·목 서버 둘·seam 검사·판정 테스트·원장·역할 문서를 리포에 둔다. | — |
| D1 | [T-005](../tasks/T-005-first-compile.md) | 공통·보안 패키지와 판정 테스트가 첫 컴파일에서 깨지지 않게 대응한다. | T-004 |
| D2 | [T-016](../tasks/T-016-security-observe.md) | 보안 설정을 실서버에서 관측하고 5번 명세 5.2(CSRF 사유)를 쓴다. | T-005 |
| D2 | [T-017](../tasks/T-017-pii-masker.md) | PiiMasker를 단위 테스트로 고정한다 — 업로드 연결은 T-028. | T-005 |
| D2 | [T-054](../tasks/T-054-safe-render.md) | 분석 화면 응답 안전 렌더 `ReportText`·`SourceChips`(완성본)를 FE-분석에 넘긴다. | T-009 |
| D3 | [T-028](../tasks/T-028-s03-masking.md) | `fix(security): [S-03] 업로드·제목·질문 PiiMasker 연결 · A-3 [T-028]` + 감사 로그 캡처. | T-017 · T-024 |
| D3 | [T-033](../tasks/T-033-rubric-d3.md) | 저녁 평가표 게이트 → MISS를 D4~D5 티켓으로 배정. | T-032 |
| D4 | [T-034](../tasks/T-034-dynamic-check.md) | 동적 점검일: 원장 취합 · B-2~7·B-9·B-12~14·A·I 행 · S-02 Burp · SBOM. FE-분석 몫(F 행·B-1·8·10·11·S-01)은 `security/rows/FA.md`에서 합친다. | T-026 · T-027 · T-028 |
| D5 | [T-048](../tasks/T-048-gates-docs9.md) | 게이트 무출력 · 9번 본문. | T-034 |
| D6 | [T-051](../tasks/T-051-demo-gate.md) | 보안 시연 리허설(Burp 순서 고정) · 제출 D-1 게이트. | T-048 |

매일 규칙: `onboarding/README.md` · git: `onboarding/GitHub규약.md` · 화면 눈 검사: `seams/smoke.md` · 하루 끝 3줄: `worklog/<내이름>/D#.md`
