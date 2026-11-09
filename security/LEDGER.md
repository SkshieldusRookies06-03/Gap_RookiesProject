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
| B-7 | [보안 설정 오류] `check-sec-deploy` · USER 토큰 `/actuator/metrics` · CORS Origin |  |  |  |  |  |
| B-8 | [예외 / 로그] 500 유발 요청 → 응답에 스택 없음 |  |  |  |  |  |
| B-9 | [감사 로그] 로그인 성공 → 실패 → 토큰 없이 `GET /api/documents` → kim 토큰으로 lee 문서 → `docker logs jobgap-backend-1 \| grep AUDIT` 4줄 · 이메일 `k***@e.com` | 미발견 |  |  | evidence/B-9-audit.txt |  |
| B-10 | [파일 업로드] 200KB 경계(봉투 413) · 1MB 초과(nginx 413 · SPEC §1 업로드 행) · .exe/.html · 이중 확장자 |  |  |  |  |  |
| B-11 | [입력값 검증] DTO @Valid 경로별 400 fields[] |  |  |  |  |  |
| B-12 | [비밀번호 저장] `SELECT LEFT(password_hash,4), LENGTH(password_hash) FROM users` → kim·lee `$2a$` · 60자 | 미발견 |  |  | evidence/B-12.txt |  |
| B-13 | [의존성 취약점] CycloneDX SBOM → security/evidence/bom.json |  |  |  |  |  |
| B-14 | [역직렬화 무결성] 클라이언트가 직렬화 값을 보내는 경로 유무 확인 | 해당 없음(클라이언트가 직렬화 객체를 보내는 경로 없음 — JSON DTO만) |  |  |  |  |
| F-1 | [XSS] 문서 제목·질문·AI 응답에 `<img src=x onerror=alert(1)>` · CSP 헤더 |  |  |  |  |  |
| F-2 | [토큰 저장 위치] Access 메모리 · Refresh localStorage 확인(DevTools) |  |  |  |  |  |
| F-3 | [토큰 위변조 / 라우트 접근 제어] 변조 토큰 · 비로그인으로 /documents 직접 접근 |  |  |  |  |  |
| F-4 | [민감정보 노출] 빌드 산출물·소스맵에서 키 grep · VITE_* 목록 |  |  |  |  |  |
| F-5 | [의존성 취약점] npm audit --json → security/evidence/npm-audit.json |  |  |  |  |  |
| F-6 | [외부 입력 검증] 업로드 확장자·크기 클라이언트 안내 (서버 검증이 정본) |  |  |  |  |  |
| F-7 | [에러 처리] 에러 봉투 → 사용자 문구 변환 확인(SPEC §4.4) |  |  |  |  |  |
| A-1 | [AI 모듈 외부 직접 접근] 외부에서 EC2:8000 · 내부 토큰 없는 호출 401 |  |  |  |  |  |
| A-2 | [Prompt Injection] 공고 본문에 숨긴 지시 (예비) |  |  |  |  |  |
| A-3 | [민감정보 유출] 가짜 연락처 이력서 `POST /api/documents` → `GET /api/documents/{id}` 제목·본문 원문 · maskedCount 0 (조치 전 ec1ddc3) | 발견 | c7fa960 · ecf2f31(질문) | 같은 업로드 → 제목·본문 마스킹본만 · maskedCount 2 · DocumentAcceptanceTest 7/7 · titlesAreMasked · questionIsMasked green(질문은 USER 저장·AI 전송 둘 다 마스킹본) | evidence/S-03/ | S-03 |
| A-4 | [과도한 사용] 질문 1000자 상한 · 반복 호출 |  |  |  |  |  |
| A-5 | [API Key 관리] 코드·로그·이미지 키 grep · compose 서비스별 env |  |  |  |  |  |
| I-1 | [비밀정보 분리] `check-sec-deploy` I-1 (이력 포함) |  |  |  |  |  |
| I-2 | [컨테이너 권한] backend·ai `docker exec … id` 비root |  |  |  |  |  |
| I-3 | [포트 노출] 외부 curl 80 200 / 8080·8000·3306 실패 캡처 |  |  |  |  |  |
| I-4 | [이미지 취약점] 태그 고정·경량 이미지 확인 |  |  |  |  |  |
| I-5 | [K8s Secret] K8s 적용 시 secret 명령 · 미적용이면 해당 없음(사유) | 해당 없음(K8s 미적용 — 가산으로 적용하면 재점검) |  |  |  |  |

## 대표 3건 + 예비 2건 (SPEC §7)

| S-ID | 행 | 재현 담당 | 조치 담당 |
|---|---|---|---|
| S-01 | B-2 | FE-분석(T-062) | BE-기능(소유 검증 + IDOR 회귀 테스트 · T-026) |
| S-02 | B-5 | 기술 리드 | BE-인증(잠금 + 테스트 · T-027) |
| S-03 | A-3 | 기술 리드 | 기술 리드(PiiMasker 연결 · T-028) |
| 예비 | A-2 | AI | AI |
| 예비 | F-1 | FE-분석 | 기술 리드(ReportText·SourceChips · T-054) · FE-화면 · DevOps(CSP) |
