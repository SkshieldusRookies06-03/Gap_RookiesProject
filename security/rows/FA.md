# FE-분석 보안 점검 기록 — 원장 옮기기 전 원본 (오너: FE-분석 · 취합: 기술 리드)

> 이 파일에만 쓴다. `security/LEDGER.md`·`docs/9-*`는 기술 리드가 이 표를 옮긴다(T-034).
> 결과 칸 값: `발견` · `미발견` · `해당 없음(사유)` · `미조치(→ §7 잔여 위험)`. 점검 방법 칸 = **실제로 실행한 명령·도구**. 방법은 onboarding/FA-FE분석.md §9.

## S-01 재현 (T-062 · D3)

| 항목 | 값 |
|---|---|
| 조치 전 커밋 | `security/evidence/S-01/before-commit.txt` |
| 재현 요청·응답 | |
| 재현 위치 | main / demo/S-01(방어 해제 브랜치) 중 하나 |
| 조치 커밋(T-026) | |
| 재확인 요청·응답 | |
| 증거 | `S-01/before.json` · `burp-before.png` · `after.json` · `burp-after.png` · `audit.log` |

## 원장 행

| 행 | 점검 방법(실행한 명령·도구) | 결과 | 재확인 명령·결과 | 증거 | 티켓 |
|---|---|---|---|---|---|
| B-1 |  |  |  |  | T-063 |
| B-8 |  |  |  |  | T-063 |
| B-10 |  |  |  |  | T-063 |
| B-11 |  |  |  |  | T-063 |
| F-1 | grep 위험 렌더 API 0줄 · `ReportText.test.jsx` 4 green · 목+headless Chrome에서 문서 제목·질문·(가로챈 SSE) AI 응답·출처에 `<img onerror>`·`<script>`·`javascript:` 입력 · nginx CSP 설정 정적 확인 · compose에서 `curl.exe -sI http://localhost/` CSP 헤더 | 미발견 — 전부 글자로 보임 · alert 0 · `javascript:` 링크 0 · 실제 CSP 헤더가 설정값과 일치 | `curl.exe -sI http://localhost/ \| findstr /i "content-security"` → `default-src 'self'; …` 일치 | `F-1.txt` · `F-1-csp.txt` · `F-1.png` · `F-1-documents.png` | T-039 |
| F-2 | `authStore.js` partialize 확인 · 화면 로그인 후 localStorage·sessionStorage·cookie 키 읽기(값은 가림) · 새로고침 | 미발견 — `jobgap-auth`에 `refreshToken`·`user`만 · access는 저장소 어디에도 없음 · 새로고침 시 refresh로 복구. 잔여 위험: refresh의 localStorage 보관(§7) | DevTools 캡처 `F-2.png` — 사람이 찍을 것(아래 수동 확인) | `F-2.txt` | T-039 |
| F-3 | 새 프로필로 보호 라우트 4개 직접 접근 · localStorage refresh를 임의 값으로 바꾸고 새로고침 · 변조·만료·없는 Bearer로 API 호출(목) · `JwtProvider` 정적 확인 · compose에서 서명 1글자 바꾼 JWT로 `GET /api/documents` | 미발견 — 4개 모두 `/login` · 가짜 refresh는 401 → 세션 비움 → `/login` · 변조 Access 401(목) · 실제 백엔드: 정상 JWT 200 · 서명 변조 JWT 401 `UNAUTHORIZED` | compose 변조 JWT → 401 `UNAUTHORIZED` · `JwtProviderTest`는 미실행(Maven 의존성 오프라인 없음) | `F-3.txt` | T-039 |
| F-4 | `npm run build` 후 `grep -rn "sk-\|tvly-\|OPENAI" dist \| wc -l` · 추가 패턴 grep · `import.meta.env` 목록 | 미발견 — 0줄 · `password`는 폼 필드 이름뿐 · `VITE_*`는 `VITE_API_URL` 하나 · 소스맵 0 | 같은 명령 0 | `F-4.txt` | T-039 |
| F-5 | `cd frontend && npm audit --json > ../security/evidence/npm-audit.json` (fix 미실행) | 미발견 — 0건(critical·high·moderate·low·info 모두 0 · 의존성 280) | 같은 명령 0 | `npm-audit.json` | T-039 |
| F-6 | 화면에서 `.exe`·300KB 업로드(요청 발생 여부 함께) · 질문 textarea `maxlength` · 목에 curl로 직접(클라이언트 우회) `.exe`·300KB·질문 1001자 · `DocumentService` 정적 확인 · compose 실제 백엔드에 직접 `a.exe`·`big.md`(307,206B)·`a.txt.exe` 업로드 | 미발견 — 화면이 먼저 안내하고 요청 0건 · 목 415/413/400 · 실제 백엔드 415 `UNSUPPORTED_FILE` / 413 `FILE_TOO_LARGE` / 415 `UNSUPPORTED_FILE`. nginx 1MB 413·실제 질문 1001자는 미검증(→ B-10 · T-063) | compose `POST http://localhost/api/documents` 3건 → 415·413·415 | `F-6.txt` | T-039 |
| F-7 | 테스트 브라우저에서 응답을 가로채 500(스택 message)·503·비봉투 502·스트림 `event: error`(스택 message) · 목 423(5회 실패) · `ErrorMessage.test.jsx` 5 green | 미발견 — 화면은 `messageFor` 문구 + 다시 시도만 · 스택·내부 주소·nginx 문구 노출 0 · 423은 해제 시각만(프론트 PASS). **실제 백엔드 500은 미검증** — 코드·DB 변경 없이 500을 내는 승인된 방법 없음 · 깨진 JSON 로그인은 400 `VALIDATION_ERROR`라 500 검증 아님(→ B-8 · T-063) | 같은 절차 · 실제 500은 기술 리드 승인 뒤 | `F-7.txt` · `F-7.png` · `F-7-stream.png` · `F-7-lock.png` | T-039 |

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
  - 실제 백엔드 500은 승인된 재현 방법이 없어 실행하지 않았다(F-7). 깨진 JSON 로그인 400 `VALIDATION_ERROR`는 B-8 참고일 뿐 500 검증이 아니다.
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
| F-7 | 500·503·502·스트림 error 모두 사용자 문구로 보이고 스택·내부 주소가 없다 · 423은 해제 시각만 | 프론트 PASS(가로챈 응답) · 실제 백엔드 500 **미검증**(승인된 재현 방법 없음 · 실제 503도 미실행) | B-8(T-063)에서 실제 오류 응답에 스택이 없는지 확인 · 실제 500 재현 방법은 기술 리드 승인 뒤 같은 화면 문구 확인 |

**발견 0건** — S-ID 요청할 것 없음. 남은 미검증: F-7 실제 백엔드 500(→ B-8) · F-6 nginx 1MB 413·실제 질문 1001자(→ B-10) · `F-2.png` 캡처.

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
5. **F-7 실서버 500** — 승인된 재현 방법이 없어 미실행. B-8(T-063)과 기술 리드 승인 뒤 확인한다.
