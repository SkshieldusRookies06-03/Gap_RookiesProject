# 보안 점검 원장 — docs/9-보안점검서.md의 정본 (스킬 P3-4)

결과 칸 값은 넷뿐: `발견` · `미발견` · `해당 없음(사유)` · `미조치(→ §7 잔여 위험)`. 빈 칸 = 미완. S-ID는 `발견` 행에만.
**FE-분석 몫: F-1~F-7 · B-1 · B-8 · B-10 · B-11 · B-2의 S-01 재현** — FE-분석은 `security/rows/FA.md`에만 쓰고, 이 원장에는 기술 리드가 옮긴다(한 파일을 둘이 고치지 않는다).
점검 방법 칸의 지금 값은 **계획**이다 — 실행한 뒤 실제 명령·도구로 바꿔 적는다. 오너: 기술 리드·보안(나머지 행) · FE-분석(위 행).

| 행 | 점검 방법(실행한 명령·도구) | 결과 | 조치 커밋 | 재확인 명령·결과 | 증거 | S-ID |
|---|---|---|---|---|---|---|
| B-1 | [SQL Injection] Repository 전수 grep(문자열 이어붙인 쿼리) · 문서 목록 sort·type에 `' OR '1'='1` |  |  |  |  |  |
| B-2 | [접근 제어 / IDOR] 토큰 A로 B의 문서·분석 메시지 GET/PUT/DELETE (S-01) |  |  |  |  |  |
| B-3 | [인증 / JWT] 발급 토큰 헤더 alg 디코드 → HS256 · 서명 교체 토큰·alg none 토큰으로 `GET /api/documents` → 401 봉투 · 만료는 `./mvnw test -Dtest='SecurityAcceptanceTest,JwtProviderTest'` 9/9(만료 401 `TOKEN_EXPIRED`) · `grep -rnE '(secret\|SECRET)\s*=\s*"' backend/src/main/java` 0건 | 미발견 |  |  | evidence/B-3.txt |  |
| B-4 | [Refresh Token 관리] DB `LENGTH(refresh_token_hash)` 64 · hex64 · `POST /api/auth/refresh` 회전 후 이전 refresh 401 `INVALID_REFRESH_TOKEN` · 로그아웃 후 새 refresh 401 | 미발견 |  |  | evidence/B-4.txt |  |
| B-5 | [로그인 Brute Force] Burp Intruder `POST /api/auth/login` kim · password 위치 페이로드 10개 → 10건 전부 401, 잠금 없음 (조치 전 0b81eba) | 발견 | e19c06a · a1ffb36(태그) | 같은 Burp 공격(동시 1) → 요청 0~4 401 · 6번째부터 423 `ACCOUNT_LOCKED` + 해제 시각 · 잠긴 kim 올바른 비밀번호도 423 · 없는 계정 401 · AUDIT `LOCK` 1줄 · AuthAcceptanceTest 6/6 | evidence/S-02/ | S-02 |
| B-6 | [CSRF] `grep -rn Cookie backend/src/main` 0건 · 사유: 인증은 Authorization 헤더로만 전달(SPEC §1 · docs/5 §5.2) | 해당 없음(쿠키 인증 없음 — Authorization 헤더만) |  |  | evidence/B-6.txt |  |
| B-7 | [보안 설정 오류] `check-sec-deploy` 무출력 · `/actuator/health` 200 · `/actuator/metrics`·`/env` 토큰 없음 401 · USER(lee) 토큰 403 · CORS preflight `Origin: http://evil.example` 403(ACAO 없음) · `http://localhost:5173` 200 · env `ACTUATOR_EXPOSURE=health,info` | 미발견 |  |  | evidence/B-7.txt |  |
| B-8 | [예외 / 로그] 500 유발 요청 → 응답에 스택 없음 |  |  |  |  |  |
| B-9 | [감사 로그] 로그인 성공 → 실패 → 토큰 없이 `GET /api/documents` → kim 토큰으로 lee 문서 → `docker logs jobgap-backend-1 \| grep AUDIT` 4줄 · 이메일 `k***@e.com` | 미발견 |  |  | evidence/B-9-audit.txt |  |
| B-10 | [파일 업로드] 200KB 경계(봉투 413) · 1MB 초과(nginx 413 · SPEC §1 업로드 행) · .exe/.html · 이중 확장자 |  |  |  |  |  |
| B-11 | [입력값 검증] DTO @Valid 경로별 400 fields[] |  |  |  |  |  |
| B-12 | [비밀번호 저장] `SELECT LEFT(password_hash,4), LENGTH(password_hash) FROM users` → kim·lee `$2a$` · 60자 | 미발견 |  |  | evidence/B-12.txt |  |
| B-13 | [의존성 취약점] `./mvnw org.cyclonedx:cyclonedx-maven-plugin:2.9.0:makeAggregateBom` → bom.json(구성 요소 141) · purl 전부 OSV querybatch 조회 · 조치 전(Spring Boot 3.3.5) 150건(CRITICAL 12 · HIGH 52 · MODERATE 67 · LOW 19) | 발견 | 95dc5bb | 11/10 같은 방법 재조회 0건 · 대조군(조치 전 SBOM) 150건 그대로 | evidence/bom.json · evidence/B-13-scan.txt · evidence/B-13-before-bom.json |  |
| B-14 | [역직렬화 무결성] 클라이언트가 직렬화 값을 보내는 경로 유무 확인 | 해당 없음(클라이언트가 직렬화 객체를 보내는 경로 없음 — JSON DTO만) |  |  |  |  |
| F-1 | [XSS] (FA T-039) 위험 렌더 API grep 0 · `ReportText.test.jsx` 4 green · 목+headless Chrome에서 제목·질문·가로챈 SSE AI 응답·출처에 `<img onerror>`·`<script>`·`javascript:` · compose `curl -sI http://localhost/` CSP | 미발견 |  | 전부 글자로 표시 · alert 0 · `javascript:` 링크 0 · 실제 CSP 헤더 = nginx 설정값 | evidence/F-1.txt · F-1-csp.txt · F-1.png · F-1-documents.png |  |
| F-2 | [토큰 저장 위치] (FA T-039) `authStore.js` partialize · 로그인 후 localStorage·sessionStorage·cookie 키 확인(값은 가림) · 새로고침 | 미발견 |  | `jobgap-auth`에 `refreshToken`·`user`만 · access는 저장소 어디에도 없음 · 새로고침 시 refresh로 복구 · refresh localStorage 보관은 점검서 §7 | evidence/F-2.txt · F-2.png |  |
| F-3 | [토큰 위변조 / 라우트 접근 제어] (FA T-039) 새 프로필로 보호 라우트 4개 직접 접근 · refresh 임의 값 · 변조·만료·없는 Bearer(목) · compose 서명 1글자 변조 JWT `GET /api/documents` | 미발견 |  | 4개 모두 `/login` · 가짜 refresh → 세션 비움 → `/login` · 실제 백엔드 변조 JWT 401 `UNAUTHORIZED` · (FA 미실행분) `JwtProviderTest` 6/6 은 TL B-3에서 실행 | evidence/F-3.txt · evidence/B-3.txt |  |
| F-4 | [민감정보 노출] (FA T-039) `npm run build` 뒤 `grep -rn "sk-\|tvly-\|OPENAI" dist` · 추가 패턴 · `import.meta.env` 목록 · 소스맵 | 미발견 |  | 키 형태 0줄 · `VITE_*`는 `VITE_API_URL` 하나 · 소스맵 0 | evidence/F-4.txt |  |
| F-5 | [의존성 취약점] (FA T-039) `cd frontend && npm audit --json > ../security/evidence/npm-audit.json`(fix 미실행) | 미발견 |  | 0건(critical·high·moderate·low·info 0 · 의존성 280) | evidence/npm-audit.json |  |
| F-6 | [외부 입력 검증] (FA T-039) 화면에서 `.exe`·300KB 업로드 · 질문 `maxlength` · 목·실제 백엔드에 curl 직접 `a.exe`·`big.md`(307,206B)·`a.txt.exe` | 미발견 |  | 화면이 먼저 막고 요청 0 · 실제 백엔드 415 `UNSUPPORTED_FILE` / 413 `FILE_TOO_LARGE` / 415 · (FA 미검증분) 실제 질문 1001자 → backend·ai 400은 TL A-4에서 확인 · nginx 1MB 413은 B-10(T-063) | evidence/F-6.txt · evidence/A-4.txt |  |
| F-7 | [에러 처리] (FA T-039) 브라우저에서 응답을 가로채 500(스택 message)·503·비봉투 502·스트림 `event: error` · 목 423 · `ErrorMessage.test.jsx` 5 green | 미발견 |  | 화면은 `messageFor` 사용자 문구 + 다시 시도만 · 스택·내부 주소·nginx 문구 0 · 423은 해제 시각만 · 실제 백엔드 500 응답 본문은 B-8(T-063)·BF T-038에서 확인 | evidence/F-7.txt · F-7.png · F-7-stream.png · F-7-lock.png |  |
| A-1 | [AI 모듈 외부 직접 접근] 배포 compose `config` → ports는 frontend만(ai-service는 내부 `app` 네트워크) · `/internal/ingest`·`DELETE /internal/documents/1`·`/internal/analyze/stream` 토큰 없음·틀린 토큰 → 401 ×6 · `/health` 200 · 대조: backend 경유 호출 200 · 외부 EC2:8000은 T-042 뒤 추가 | 미발견 |  |  | evidence/A-1.txt |  |
| A-2 | [Prompt Injection] 공고 본문에 숨긴 지시 (예비) |  |  |  |  |  |
| A-3 | [민감정보 유출] 가짜 연락처 이력서 `POST /api/documents` → `GET /api/documents/{id}` 제목·본문 원문 · maskedCount 0 (조치 전 ec1ddc3) | 발견 | c7fa960 · ecf2f31(질문) | 같은 업로드 → 제목·본문 마스킹본만 · maskedCount 2 · DocumentAcceptanceTest 7/7 · titlesAreMasked · questionIsMasked green(질문은 USER 저장·AI 전송 둘 다 마스킹본) | evidence/S-03/ | S-03 |
| A-4 | [과도한 사용] 1001자 질문 → backend 400 `VALIDATION_ERROR` fields · ai 직접도 400 · 1000자 200 · 상한 REPORT 청크 12·FOLLOWUP_K 4·Tavily 3·이력 6 · 반복 호출 20회 6초 → 200 ×20 · 429 0 · Rate Limit 코드 0건 | 미조치(→ §7 잔여 위험) |  |  | evidence/A-4.txt |  |
| A-5 | [API Key 관리] 서비스별 `printenv` 이름만 → 키는 ai-service에만 · `git grep` 키 형태 0 · backend·ai `docker logs` 키 형태 0 · 이미지 `Config.Env`에 키 없음 | 미발견 |  |  | evidence/A-5.txt |  |
| I-1 | [비밀정보 분리] `check-sec-deploy` 무출력(이력 포함) · `.gitignore` `.env`·`.env.*` · 추적 env 파일은 `.env.example`·`frontend/.env.development`(비밀 아님)뿐 · `.env` 커밋 이력 0 | 미발견 |  |  | evidence/I-1.txt |  |
| I-2 | [컨테이너 권한] `docker exec jobgap-backend-1 id` · `jobgap-ai-service-1 id` → 둘 다 `uid=1001(app)` · Dockerfile 실행 스테이지 `USER app` | 미발견 |  |  | evidence/I-2.txt |  |
| I-3 | [포트 노출] 외부 curl 80 200 / 8080·8000·3306 실패 캡처 |  |  |  |  |  |
| I-4 | [이미지 취약점] 모든 `FROM`·`image:` 태그 고정(latest 0 · `check-sec-deploy` 무출력) · 실행 이미지 jre-jammy·python slim·nginx alpine · `uv sync --locked` · 배포 태그 `${{ github.sha }}`(feature/infra) | 미발견 |  |  | evidence/I-4.txt |  |
| I-5 | [K8s Secret] K8s 적용 시 secret 명령 · 미적용이면 해당 없음(사유) | 해당 없음(K8s 미적용 — 가산으로 적용하면 재점검) |  |  |  |  |

## 대표 3건 + 예비 2건 (SPEC §7)

| S-ID | 행 | 재현 담당 | 조치 담당 |
|---|---|---|---|
| S-01 | B-2 | FE-분석(T-062) | BE-기능(소유 검증 + IDOR 회귀 테스트 · T-026) |
| S-02 | B-5 | 기술 리드 | BE-인증(잠금 + 테스트 · T-027) |
| S-03 | A-3 | 기술 리드 | 기술 리드(PiiMasker 연결 · T-028) |
| 예비 | A-2 | AI | AI |
| 예비 | F-1 | FE-분석 | 기술 리드(ReportText·SourceChips · T-054) · FE-화면 · DevOps(CSP) |
