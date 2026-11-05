# 레인 상세 명세 — 기술 리드·보안 (ydh)

> 정본은 `SPEC.md`. 이 문서는 "어떻게"다 — 다르면 SPEC이 이긴다. 티켓 원문은 `tasks/T-###-*.md`, 일정은 `tasks/BOARD.md`.
> 이 레인은 **계약의 주인 + 보안 레인**이다. FE-분석과 분담: 원장 F-1~F-7 점검·기록은 FE-분석, 분석 화면의 응답 안전 렌더(`ReportText`·`SourceChips` · T-054)는 나. 남의 기능 코드를 대신 짜지 않는다(예외: S-03 연결 호출 1줄 × 2 — BE-기능 리뷰).

## 0. 판정 테스트 표

| 테스트 | 내용 | 티켓 | D1 상태 |
|---|---|---|---|
| `SecurityAcceptanceTest` ① | `/actuator/health` 토큰 없이 200 · USER 토큰 `/actuator/metrics` 403 봉투 | T-005·T-016 | green 목표 |
| `SecurityAcceptanceTest` ② | 토큰 없음 401 `UNAUTHORIZED` · 만료 401 `TOKEN_EXPIRED` · 위조 401 | T-005 | green 목표 |
| `SecurityAcceptanceTest` ③ | API 응답 CSP `default-src 'none'` · 없는 경로 404 봉투 | T-005 | green 목표 |
| `PiiMaskerTest` 6개 | 네 종 마스킹 · 한글 인접 · 생년월일 문맥 · 200KB 1초 · 일반 텍스트 보존 · 이메일 로그 마스킹 | T-017 | green 목표 |
| `DocumentAcceptanceTest` ③ 마스킹 단언 | ingest 본문·DB에 원문 연락처 없음 · `masked_count` | **T-028** (S-03) | red |
| 나머지 전 레인 판정 테스트 | 작성자 = 나 · 수정 권한도 나만 | — | — |

판정 테스트를 고쳐 달라는 요청이 오면: ① SPEC 문장과 대조 → SPEC이 맞으면 구현이 고친다 ② SPEC이 틀렸으면 SPEC PR(팀장 승인) → 같은 PR에서 테스트·목·검사를 고친다.

## 1. 완료 정의 (D5 저녁 동결 시점)

- [ ] `SecurityAcceptanceTest`·`PiiMaskerTest` green · `DocumentAcceptanceTest` ③ green
- [ ] `security/LEDGER.md` 31행 결과 칸 전부(발견·미발견·해당 없음·미조치 중 하나) + 점검 방법 칸이 실제 실행한 명령
- [ ] `fix(security): [S-0N]` 커밋 S-01·S-02·S-03(+예비 발견 시 S-04) · 각 `security/evidence/S-0N/`에 재현·재확인 증거
- [ ] `security/evidence/bom.json` · `security/evidence/npm-audit.json`
- [ ] `node scripts/check-sec-deploy.mjs` 무출력 · `node scripts/check-rubric-p3.mjs` 무출력(사람 판정 행은 `--human` 캡처)
- [ ] 9번 보안점검서 전부 · 2번 6절 · 5번 5절 커밋
- [ ] CI 2단계 `continue-on-error` 세 줄 삭제(D5 아침)

## 2. 내 파일

| 경로 | 역할 | 티켓 |
|---|---|---|
| `SPEC.md` · `CLAUDE.md` · `.github/CODEOWNERS` | 계약·규약·오너십 | T-001 |
| `mock/server.mjs` · `seams/check-api.mjs` · `seams/check-ai.mjs` · `seams/check-scope.mjs` | 첫째 seam 목·검사 · 둘째 seam 검사 · 경계 검사 | T-001 |
| `scripts/check-sec-deploy.mjs` · `scripts/check-rubric-p3.mjs` | 정적 보안 게이트 · 평가표 게이트(스킬 사본 — 고치지 않는다) | T-001 |
| `backend/**/common/` | ApiResponse · PageResponse · ErrorCode · BusinessException · GlobalExceptionHandler · PageRequests | T-005 |
| `backend/**/security/` | SecurityConfig · JwtProvider · JwtProperties · JwtAuthenticationFilter · EntryPoint · AccessDeniedHandler · SecurityResponses · AuditLog · SecurityAuditListener · PiiMasker · AuthUser | T-005·T-016·T-017 |
| `backend/src/test/**` · `frontend/src/**/*.test.js(x)`(판정분) · `ai-module/tests/` | 판정 테스트 | T-005 |
| `security/LEDGER.md` · `security/evidence/` · `security/ACCEPTED.txt` | 원장·증거 | T-034 |
| `docs/9-*` 전부 · `docs/2-*` 6절 · `docs/5-*` 5절 | 문서 | T-034·T-048 |

## 3. 티켓별 구현 명세

### T-001 · T-005 (D1) — 이미 완성본. 할 일은 확인과 동결
1. 커밋 후 `node seams/check-scope.mjs --owners` 무출력 · `node mock/server.mjs` + `node seams/check-api.mjs http://localhost:8080` 20줄 green
2. BE-인증의 골격 커밋 직후 `./mvnw test -Dtest='JobgapApplicationTests,PiiMaskerTest,SecurityAcceptanceTest'` — **처음 컴파일되는 순간**. 에러는 내 패키지면 내가, 남의 골격이면 그 레인과 같이 본다
3. D1 저녁 동결 회의(팀장 진행 · 10분): SPEC §2·§4·§6 낭독 → 질문 → 팀장 승인 → SPEC 머리에 `동결 v1 · 2026-11-05`

### T-054 (D2) — 응답 안전 렌더 컴포넌트 (FE-분석과 분담 · 완성본)
- `frontend/src/pages/analysis/ReportText.jsx` — 리포트 마크다운 일부(제목·표·목록·문단)를 HTML 없이 React 요소로 · `parseBlocks()` 내보냄
- `frontend/src/pages/analysis/SourceChips.jsx` — doc/web 칩 · 웹은 `safeUrl()`로 http(s)만 링크 · `rel="noopener noreferrer"`
- 테스트 `ReportText.test.jsx` 4개 green(작성 완료) · FE-분석에게 import 방법 공유 → FE-분석이 화면에 끼운다
- 커밋: `feat(fe): 응답 안전 렌더 ReportText·SourceChips — F-1 방어 [T-054]`

### T-016 (D2) — 보안 설정 관측
- 실서버(`./mvnw spring-boot:run` + `.env` 값)에서 관측하고 SPEC §1 표 옆에 결과 한 줄씩:
  - JWT alg: `node -e 'console.log(JSON.parse(Buffer.from(process.argv[1].split(".")[0],"base64url")).alg)' "$TOKEN"` → `HS256`
  - 헬스: `curl -s localhost:8080/actuator/health` 200 · USER 토큰으로 `/actuator/metrics` 403 봉투
  - CSP: `curl -sI localhost:8080/actuator/health | grep -i content-security` 
- 5번 명세 5.2에 CSRF 사유 문장(SecurityConfig 주석 그대로) — **내 절 = 내 커밋**

### T-017 (D2) — PiiMasker 고정
- 완성본 + 테스트 green 확인만. **업로드에 연결하지 않는다** — S-03의 "조치 전" 상태가 이력에 있어야 한다

### S-01 · S-02 재현 (D3 · 조치 커밋보다 먼저)
조치 전 커밋 = T-014(BF 문서 API · 소유 검증 없음) · T-015(BA 인증 · 잠금 없음)가 머지된 시점.
```bash
# S-01 IDOR — 시드: kim(문서 1·2) · lee(문서 3·4, 분석 1)
T=$(curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"kim@example.com","password":"Passw0rd!"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.accessToken')
curl -s localhost:8080/api/documents/3 -H "Authorization: Bearer $T" | tee security/evidence/S-01/before.json   # 200이면 발견
git rev-parse --short HEAD > security/evidence/S-01/before-commit.txt
```
- Burp: Proxy로 `GET /api/documents/1`(내 것) 잡기 → Repeater → id를 3으로 → 200 화면 캡처 `S-01/burp-before.png`
- S-02: Burp Intruder · `POST /api/auth/login` · password 위치 페이로드 10개 · 결과 표(전부 401, 잠금 없음) 캡처 `S-02/intruder-before.png`
- 재현 끝났다고 채널에 → BF가 T-026, BA가 T-027 머지 → **같은 요청으로 재확인**: `after.json`(403 봉투) · `intruder-after.png`(6번째부터 423) · 감사 로그 줄 `audit.log`

### T-028 (D3) — S-03 마스킹 연결 + 감사 로그
1. 재현(조치 전): `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` → 가짜 연락처 든 이력서 업로드 →
   AI 목/실물 로그 또는 `GET /api/documents/{id}` 응답에 `010-1234-5678` 원문 → `S-03/before.json`
2. 조치 — 수정 허용: `DocumentService`(업로드 본문·제목) · `AnalysisService`(질문) 호출 한 줄씩:
```java
var masked = PiiMasker.mask(text);            // 업로드: 디코딩 직후, 저장·ingest 전
// BF가 만든 Document 생성 코드에 원문 대신 넘긴다: 제목 PiiMasker.maskAndTrim(title, 100).text() · 본문 masked.text() · 개수 masked.count()
String question = PiiMasker.maskAndTrim(req.question(), 1000).text();   // 스트림: USER 저장·AI 전송 전
```
3. 커밋: `fix(security): [S-03] 업로드·제목·질문 PiiMasker 연결 · A-3 [T-028]` · BF 리뷰
4. 재확인: 같은 업로드 → `maskedCount: 2` · `S-03/after.json` · `DocumentAcceptanceTest` ③ green
5. 감사 로그 4줄 캡처(로그인 성공·실패·401·403 — 이메일이 `k***@e.com`) → `security/evidence/B-9-audit.txt`

### T-033 (D3 저녁) — 평가표 게이트
`node scripts/check-rubric-p3.mjs > security/evidence/rubric-D3.txt` → MISS 줄마다 담당 레인·티켓을 붙여 팀 채널에. 이미 티켓이 있는 MISS는 그 티켓으로, 없으면 BOARD에 새 티켓(팀장 승인).

### T-034 (D4) — 동적 점검일 (원장 31행을 하루에)
오전: 자동·빠른 것 → 오후: 서버 띄운 동적 점검 → 저녁: 원장·9번 파생.

| 행 묶음 | 방법(점검 방법 칸에 그대로) | 증거 |
|---|---|---|
| B-1 | `grep -rn '"\s*+' backend/src/main --include=*Repository.java` 0건 · `sort=title' OR '1'='1` → 400 | `B-1.txt` |
| B-2 · B-5 | S-01 · S-02 (위) | `S-01/` · `S-02/` |
| B-3 · B-4 · F-2 · F-3 | 만료·위조 토큰 401(SecurityAcceptanceTest 출력) · DB `refresh_token_hash` 64자 · 재발급 후 이전 refresh 401 · DevTools localStorage 캡처 · 비로그인 `/documents` → `/login` | `B-3.txt` 등 |
| B-6 | 쿠키 인증 0 (`grep -rn Cookie backend/src/main` 0) + 사유 문장 | — |
| B-7 · B-8 · I-1 · I-3 · I-4 | `node scripts/check-sec-deploy.mjs` 무출력 · 500 유발(잘못된 JSON 본문) 응답에 스택 없음 | `sec-deploy.txt` |
| B-9 | 감사 로그 4줄 | `B-9-audit.txt` |
| B-10 · F-6 | 200KB+1 파일(nginx 경유 413 봉투) · `.exe`·`.html`·`a.md.exe` → 415 | `B-10.txt` |
| B-11 | 필드별 400 `fields[]` | — |
| B-12 | `SELECT LEFT(password_hash,4) FROM users` → `$2a$` | — |
| B-13 | `cd backend && ./mvnw org.cyclonedx:cyclonedx-maven-plugin:makeAggregateBom && cp target/bom.json ../security/evidence/bom.json` — High 이상이면 `발견` → 버전 올림 커밋도 `fix(security):` | `bom.json` |
| B-14 · I-5 | 해당 없음(직렬화 값을 받는 경로 없음 · K8s 미적용 — 적용하면 DevOps와 재점검) | — |
| F-1~F-7 | **FE-분석이 점검·기록**(onboarding/FA-FE분석.md §9) — 나는 원장에 옮겨 취합 · F-5 npm audit도 FE-분석 | FE-분석의 `F-*` |
| A-1 | dev 아닌 compose에서 호스트 `curl -m 3 localhost:8000` 실패 · 토큰 없는 내부 호출 401(check-ai) | `A-1.txt` |
| A-2 | AI 레인 T-036 결과를 옮긴다 | — |
| A-3 | S-03 + check-ai owner 필터 행 green | `S-03/` |
| A-4 | 1001자 질문 400 · (Rate limit 없음 → `미조치`, §7 잔여 위험) | — |
| A-5 · I-2 | compose 서비스별 env(LLM 키는 ai-service만) · `docker compose exec backend id` → uid 1001 | — |

원장 한 행 예: `| B-2 | Burp Repeater: kim 토큰으로 GET /api/documents/3 → 200 (a1b2c3d) | 발견 | e4f5g6h | 같은 요청 → 403 봉투 + AUDIT 로그 | evidence/S-01/ | S-01 |`

### T-048 (D5) — 게이트 무출력 · 9번 본문
- `node scripts/check-rubric-p3.mjs --human > security/evidence/rubric-human.txt` — 사람 판정 행 캡처가 문서에 있는지 하나씩
- 9번: 원장 31행 → §2~§5 표 · S-ID → §6(재현 커밋 해시 · 조치 커밋 · 재확인) · 잔여 위험 §7(SPEC §7 목록)
- `git log --oneline --grep='\[S-0'`의 S-ID 종류 수 = 9번 §6 건수

### T-051 (D6) — 시연 리허설 · 제출 게이트
- 보안 시연 순서 고정(5분): S-01 Burp Repeater(전·후) → S-02 Intruder(전·후) → S-03 마스킹 전후 JSON 한 장 → 원장 셈(발견 n · 조치 n · 잔여 n)
- 제출 D-1 게이트: 스킬 `references/submission-docs-p3.md` §3 9항목

## 4. 받는 것·주는 것

| 상대 | 받는 것 | 주는 것 | 언제 |
|---|---|---|---|
| BE-인증 | 골격 커밋(컴파일) · T-027 잠금 | JwtProvider·PasswordEncoder·감사 리스너 · S-02 재현 | D1 · D3 |
| BE-기능 | T-014 머지(조치 전) · T-026 | PageRequests·ErrorCode · S-01 재현 · S-03 연결 리뷰 요청 | D2~D3 |
| AI | A-2 결과(T-036) | check-ai · AI 판정 테스트 | D4 |
| FE-분석 | F-1~F-7 점검·증거(D4) · 9번 F절 초안 | `ReportText`·`SourceChips`(D2) · 판정 테스트 | D2·D4 |
| FE-화면 | F-1 재현 대상 화면(내 문서 제목) | 판정 테스트 · ErrorMessage 문구 표(§4.4) | D3~D4 |
| DevOps | 외부 포트 캡처(T-042) · CSP 헤더 | I-행 점검 방법 · `check-sec-deploy` | D4~D5 |
| 팀장 | 동결 승인 · 자르기 결정 | 게이트 결과(D3·D5) · 보안 시연 5분 | D1·D3·D5 |

리뷰 규칙: seam 파일·보안 파일·판정 테스트 PR만 내가 본다. 그 밖은 부오너(SPEC §8).

## 5. 일정

| 날 | 오전 | 오후 | 저녁 |
|---|---|---|---|
| D1 | T-001 커밋 · 팀원 환경 확인 | BE 첫 컴파일 대응 · 목 서버 시연 | **SPEC 동결** |
| D2 | T-016 관측 | T-017 · 리뷰 | `check-sec-deploy` 1회 |
| D3 | S-01·S-02 재현(조치 전) | T-028 · S-01/S-02 재확인 | T-033 rubric |
| D4 | 동적 점검(자동 행) | 동적 점검(Burp·컨테이너) | 원장 31행 · 9번 초안 |
| D5 | CI 2단계 필수로 | EC2 외부 포트 재확인(DevOps와) | T-048 · 동결 |
| D6 | 시연 리허설 | 제출 게이트 | — |

## 6. 막힐 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| 모든 요청 401인데 토큰은 맞다 | JWT 필터가 체인 밖에서 먼저 돌았다 | `jwtFilterRegistration` 빈(setEnabled false)이 있는지 |
| 스트림 끝에 AccessDenied 로그 | ASYNC 디스패치 인가 | `dispatcherTypeMatchers(ASYNC, ERROR).permitAll()` 위치 |
| `/actuator/health` 401 → frontend 안 뜸 | permitAll이 ADMIN 줄보다 아래 | 순서 |
| 스트림 403이 봉투가 아니라 빈 응답 | Accept: text/event-stream 협상 | `respond()`의 `contentType(APPLICATION_JSON)` 유지 |
| 재현하려는데 이미 조치가 머지됨 | 커밋 순서 | `git switch -c demo/S-01 <조치 전 해시>`에서 재현하고 9번에 "방어 해제 브랜치에서 재현" 그대로 적기 |
| `check-sec-deploy` 이력 RED(키) | 누가 키를 커밋했다 | **발급처에서 키 폐기·재발급 먼저** → I-1 조치 칸에 폐기 일시 → `security/ACCEPTED.txt` |

## 7. 내 문서 절

| 문서 | 절 | 정본 |
|---|---|---|
| 9-보안점검서 | 전부 | `security/LEDGER.md` · `git log --grep='\[S-0'` · `security/evidence/` |
| 2-시스템아키텍처 | 6절 보안 아키텍처 | SPEC §1 인증·포트 · compose 망 3 · AI 내부 토큰 |
| 5-Backend명세 | 5절 보안 구현 | SecurityConfig 주석(CSRF 사유) · JwtProvider · PiiMasker · AuditLog |

## 8. 코딩 에이전트 지시서 예시 (T-028 조치 부분)

```
[배경] SPEC.md §6.5 마스킹 표 · ADR-04 · §7 S-03. PiiMasker는 backend/src/main/java/com/jobgap/security/PiiMasker.java에 완성돼 있다.
[목표] 업로드 본문·문서 제목·질문을 저장·AI 전송 전에 PiiMasker.mask()로 바꾼다.
[수용 기준] DocumentAcceptanceTest ③ green · AnalysisAcceptanceTest 전부 그대로 · 마스킹 개수는 documents.masked_count에
[제약] 수정 허용: DocumentService.java의 업로드·제목 경로 한 줄씩 · AnalysisService.java의 질문 저장 직전 한 줄. 다른 줄·다른 파일 금지.
       판정 테스트 수정 금지 · commit 금지
[확인 명령] cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,AnalysisAcceptanceTest,PiiMaskerTest'
```

## 10. 내 티켓 전체 (최신 · `tasks/` 생성본 — 위 절과 번호가 다르면 이 표가 이긴다)

150줄 규칙으로 쪼갠 것: 새 **T-054**(응답 안전 렌더)

| 날 | 티켓 | 할 일 | 선행 |
|---|---|---|---|
| D1 | [T-001](../tasks/T-001-spec-gates.md) | 설계 정본·목 서버 둘·seam 검사·판정 테스트·원장·역할 문서를 리포에 둔다 | — |
| D1 | [T-005](../tasks/T-005-first-compile.md) | 공통·보안 패키지와 판정 테스트가 첫 컴파일에서 깨지지 않게 대응한다 | T-004 |
| D2 | [T-016](../tasks/T-016-security-observe.md) | 보안 설정을 실서버에서 관측하고 5번 명세 5.2(CSRF 사유)를 쓴다 | T-005 |
| D2 | [T-017](../tasks/T-017-pii-masker.md) | PiiMasker를 단위 테스트로 고정한다 | T-005 |
| D2 | [T-054](../tasks/T-054-safe-render.md) | 분석 화면 응답 안전 렌더 `ReportText`·`SourceChips`(완성본)를 FE-분석에 넘긴다 | T-009 |
| D3 | [T-028](../tasks/T-028-s03-masking.md) | `fix(security): [S-03] 업로드·제목·질문 PiiMasker 연결 · A-3 [T-028]` + 감사 로그 캡처 | T-017 · T-024 |
| D3 | [T-033](../tasks/T-033-rubric-d3.md) | 저녁 평가표 게이트 → MISS를 D4~D5 티켓으로 배정 | T-032 |
| D4 | [T-034](../tasks/T-034-dynamic-check.md) | 동적 점검일: 원장 B·A·I 행 · Burp(S-01·S-02 재확인) · SBOM. F 행은 FE-분석(T-039) | T-026 · T-027 · T-028 |
| D5 | [T-048](../tasks/T-048-gates-docs9.md) | 게이트 무출력 · 9번 본문 | T-034 |
| D6 | [T-051](../tasks/T-051-demo-gate.md) | 보안 시연 리허설(Burp 순서 고정) · 제출 D-1 게이트 | T-048 |

매일 규칙: `onboarding/README.md` · git: `onboarding/GitHub규약.md` · 화면 눈 검사: `seams/smoke.md` · 하루 끝 3줄: `worklog/<내이름>/D#.md`
