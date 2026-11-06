# 티켓 보드 — 7레인 × 6일 (생성 파일 — 손으로 고치지 말고 생성기 표를 고친다)

> 정본: SPEC.md · 지시서: `tasks/T-###-*.md` · 날짜×레인 표: `tasks/ROADMAP.md` · 규칙: `onboarding/README.md` · git: `onboarding/GitHub규약.md`

레인: **LD** 팀장(BE-인증) · **TL** 기술 리드·보안 · **BF** BE-기능 · **AI** AI · **FS** FE-화면 · **FA** FE-분석 · **DO** DevOps

## D1 (11/5 목 — 설계 동결 · 목 둘 · 스파이크 셋 · 골격 확인)

| T | 레인 | 할 일 | 선행 | 확인 |
|---|---|---|---|---|
| [T-001](T-001-spec-gates.md) | TL | 설계 정본·목 서버 둘·seam 검사·판정 테스트·원장·역할 문서를 리포에 둔다. | — | `node scripts/check-sec-deploy.mjs` |
| [T-002](T-002-repo-settings.md) | LD | GitHub 리포 설정과 팀 핸들을 확정한다. | T-001 | `(GitHub Settings 화면 캡처를 PR 설명에)` |
| [T-003](T-003-spec-freeze.md) | LD | D1 저녁 SPEC 동결 회의를 열고 v1을 승인한다. | T-001 | `git log -1 --format=%s -- SPEC.md` |
| [T-004](T-004-spring-skeleton.md) | LD | Maven wrapper를 넣고 백엔드를 처음 컴파일·기동한다. | T-001 | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d database` |
| [T-005](T-005-first-compile.md) | TL | 공통·보안 패키지와 판정 테스트가 첫 컴파일에서 깨지지 않게 대응한다. | T-004 | `cd backend && ./mvnw test -Dtest='SecurityAcceptanceTest,PiiMaskerTest'` |
| [T-006](T-006-spike-sse.md) | BF | 스파이크②: FastAPI 토큰 3개 → Spring WebClient 중계 → curl에 시간 간격을 두고 보인다. | — | `curl -sN -X POST localhost:8080/<스파이크 경로>` |
| [T-007](T-007-spike-llm.md) | AI | 스파이크①: OpenAI 응답 1 + 임베딩 1 · mock_app 실행 확인 · 의존성 고정. | — | `cd ai-module && pip install -r requirements.txt && pytest -q -k 'health or require_token'` |
| [T-008](T-008-spike-ec2.md) | DO | 스파이크③: EC2 + Docker + nginx Hello 외부 접속 · 인스턴스 타입 결정. | — | `curl -I http://<EC2>/` |
| [T-009](T-009-frontend-skeleton.md) | FS | 프론트 골격을 받아 빌드·공용 테스트·목 연결을 확인한다. | T-001 | `cd frontend && npm ci && npm run build && npx vitest run src/api` |
| [T-010](T-010-analysis-wire.md) | FA | 분석 화면 와이어(종이 1장)를 SPEC §4.3과 대조하고, 목 스트림을 직접 읽어 본다. | T-009 | `(사진·콘솔 캡처를 PR 설명에)` |
| [T-011](T-011-golden-data.md) | AI | 골든셋 데이터: 공고 10 + 가짜 이력서 3 + 문항 10(그중 3개는 기업 최신 정보). | — | `ls ai-module/eval/data/postings | wc -l` |

## D2 (11/6 금 — 모듈 단독 동작 · 방어는 별도 커밋)

| T | 레인 | 할 일 | 선행 | 확인 |
|---|---|---|---|---|
| [T-012](T-012-flyway.md) | BF | Flyway V1·V2를 빈 DB에서 적용하고 시드 시각 오프셋을 관측한다. | T-004 | `cd backend && ./mvnw test -Dtest='JobgapApplicationTests,BoundaryAcceptanceTest#timesAreKst'` |
| [T-013](T-013-entities.md) | BF | Document·Analysis·AnalysisMessage 엔티티와 리포지토리 3개. | T-012 · T-015(User) | `cd backend && ./mvnw test -Dtest=JobgapApplicationTests` |
| [T-014](T-014-document-read-api.md) | BF | 문서 목록·상세·제목 수정·삭제(단순 삭제) — **소유 검증 없이**(S-01 조치 전 상태). | T-013 | `cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,BoundaryAcceptanceTest#paging+timesAreKst'` |
| [T-015](T-015-user-register-login.md) | LD | User 엔티티·가입·로그인(+감사 이벤트 발행). **D2 오전 우선** — BE-기능 엔티티가 User를 참조한다. | T-004 | `cd backend && ./mvnw test -Dtest='AuthAcceptanceTest,BoundaryAcceptanceTest#registerValidation'` |
| [T-058](T-058-refresh-logout.md) | LD | refresh 회전(SHA-256 해시 저장)과 로그아웃. | T-015 | `cd backend && ./mvnw test -Dtest=AuthAcceptanceTest` |
| [T-016](T-016-security-observe.md) | TL | 보안 설정을 실서버에서 관측하고 5번 명세 5.2(CSRF 사유)를 쓴다. | T-005 | `cd backend && ./mvnw test -Dtest=SecurityAcceptanceTest` |
| [T-017](T-017-pii-masker.md) | TL | PiiMasker를 단위 테스트로 고정한다 — 업로드 연결은 T-028. | T-005 | `cd backend && ./mvnw test -Dtest=PiiMaskerTest` |
| [T-054](T-054-safe-render.md) | TL | 분석 화면 응답 안전 렌더 `ReportText`·`SourceChips`를 만들어(판정 테스트 `ReportText.test.jsx` 4) FE-분석에 넘긴다. | T-009 | `cd frontend && npx vitest run src/pages/analysis` |
| [T-018](T-018-ai-ingest.md) | AI | vectorstore ingest·delete를 Chroma로 구현한다. | T-007 | `cd ai-module && pytest -q` |
| [T-019](T-019-ai-report-stream.md) | AI | REPORT 단일 경로(load → generate) 스트림. | T-018 | `cd ai-module && pytest -q` |
| [T-020](T-020-login-pages.md) | FS | 로그인·회원가입 화면과 보호 라우트. | T-009 | `cd frontend && npm run build && npm test` |
| [T-021](T-021-documents-list.md) | FS | 내 문서 목록 — 탭·정렬·페이지·상태 넷. | T-009 | `cd frontend && npx vitest run src/pages/DocumentsPage.test.jsx` |
| [T-022](T-022-chat-stream.md) | FA | useChatStream과 분석 화면 기본(선택 → 스트리밍 → 중단). | T-010 · T-054 | `cd frontend && npx vitest run src/hooks` |
| [T-023](T-023-containers.md) | DO | 컨테이너 파일을 점검하고 로컬 config를 통과시킨다. | T-008 | `docker compose config -q && node scripts/check-sec-deploy.mjs` |
| [T-057](T-057-documents-write.md) | FS | 업로드(useUpload)·제목 수정·삭제 확인. | T-021 | `cd frontend && npm test` |

## D3 (11/9 월 — 1차 통합 = 로컬 compose 전체 E2E)

| T | 레인 | 할 일 | 선행 | 확인 |
|---|---|---|---|---|
| [T-024](T-024-ai-client-upload.md) | BF | AiClient 단건(ingest·delete)과 업로드 흐름. | T-014 · T-018 | `cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,BoundaryAcceptanceTest#uploadExtensionAndMime+uploadSizeBoundary+uploadTitleLength'` |
| [T-055](T-055-delete-order.md) | BF | 문서 삭제 순서: AI DELETE → 그 문서를 쓴 분석 → 문서 · AI 실패면 503이고 DB 그대로. | T-024 | `cd backend && ./mvnw test -Dtest=DocumentAcceptanceTest` |
| [T-025](T-025-stream-relay.md) | BF | 분석 스트림 중계 — 새 분석·후속 질문 · done 가로채 저장. | T-006 · T-013 · T-019 | `cd backend && ./mvnw test -Dtest='AnalysisAcceptanceTest,BoundaryAcceptanceTest#reportRequestHasNoNulls+historyIsLastSix+questionLength+analysisTitleIsTruncated'` |
| [T-056](T-056-analysis-list.md) | BF | 분석 목록(lastStatus 파생)·메시지 페이징. | T-025 | `cd backend && ./mvnw test -Dtest='AnalysisAcceptanceTest,BoundaryAcceptanceTest#paging'` |
| [T-026](T-026-s01-ownership.md) | BF | `fix(security): [S-01] 문서·분석 소유 검증 · B-2 [T-026]` — 방어만 담은 커밋 하나. | T-014 · T-025 · T-062(FE-분석 재현) | `cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,AnalysisAcceptanceTest'` |
| [T-027](T-027-s02-lock-seed.md) | LD | `fix(security): [S-02] 로그인 5회 잠금 · B-5 [T-027]` + SeedIngestRunner. | T-015 · 기술 리드 재현 | `cd backend && ./mvnw test -Dtest=AuthAcceptanceTest` |
| [T-028](T-028-s03-masking.md) | TL | `fix(security): [S-03] 업로드·제목·질문 PiiMasker 연결 · A-3 [T-028]` + 감사 로그 캡처. | T-017 · T-024 | `cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,BoundaryAcceptanceTest#titlesAreMasked+questionIsMasked'` |
| [T-029](T-029-langgraph-branch.md) | AI | LangGraph 분기(grade → Tavily)와 FOLLOWUP 검색. | T-019 | `cd ai-module && pytest -q` |
| [T-062](T-062-s01-reproduce.md) | FA | S-01 IDOR 재현 — 조치 전 커밋에서 kim 토큰으로 lee 문서·분석을 열어 200을 캡처하고, T-026 머지 뒤 같은 요청 403으로 재확인한다. | T-014(머지·소유 검증 없음) · T-015 | `curl -s localhost:8080/api/documents/3 -H "Authorization: Bearer $T"` |
| [T-030](T-030-followup-ui.md) | FA | 후속 질문·기록 재진입(hydrate)·분석 화면 상태 테스트. | T-022 | `cd frontend && npm test` |
| [T-031](T-031-analyses-page.md) | FS | 분석 기록 화면. | T-009 | `cd frontend && npm test` |
| [T-032](T-032-compose-e2e.md) | DO | compose 전체 기동 = 1차 통합 E2E. | T-023 · T-024 · T-025 | `docker compose up -d --build && OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1 node seams/check-api.mjs http://localhost` |
| [T-033](T-033-rubric-d3.md) | TL | 저녁 평가표 게이트 → MISS를 D4~D5 티켓으로 배정. | T-032 | `node scripts/check-rubric-p3.mjs > security/evidence/rubric-D3.txt` |

## D4 (11/10 화 — 동적 점검 · 중간 검증 · GHA)

| T | 레인 | 할 일 | 선행 | 확인 |
|---|---|---|---|---|
| [T-034](T-034-dynamic-check.md) | TL | 동적 점검일: 원장 취합 · B-2~7·B-9·B-12~14·A·I 행 · S-02 Burp · SBOM. FE-분석 몫(F 행·B-1·8·10·11·S-01)은 `security/rows/FA.md`에서 합친다. | T-026 · T-027 · T-028 | `node scripts/check-rubric-p3.mjs \| grep R-SE` |
| [T-035](T-035-golden-eval.md) | AI | 골든셋 세 조건 평가 → `eval/result.md`. | T-029 · T-011 | `cd ai-module && LLM_PROVIDER=openai python eval/run_eval.py` |
| [T-036](T-036-a2-injection.md) | AI | 프롬프트 인젝션 재현 → 자료 구분자 조치(발견이면 `fix(security): [S-04]`). | T-029 | `cd ai-module && pytest -q` |
| [T-037](T-037-edge-400.md) | LD | 400·415 경계 정리 — 500이나 봉투 아닌 응답 제거. | T-015 | `cd backend && ./mvnw test` |
| [T-038](T-038-be-500-check.md) | BF | 500 경로 점검(삭제 중 AI 실패 · 스트림 중 AI 다운) · N+1 확인. | T-025 | `docker compose stop ai-service && OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1 node seams/check-api.mjs http://localhost` |
| [T-039](T-039-fe-security-check.md) | FA | 스트림 error UI + 프론트 보안 점검 F-1~F-7(증거·기록). | T-022 · T-054 | `cd frontend && npm test` |
| [T-063](T-063-be-static-check.md) | FA | 백엔드 정적·입력 점검 B-1·B-8·B-10·B-11 — 실행한 명령과 결과를 기록한다. | T-026 · T-037 | `grep -rn '" *+ *[a-z]' backend/src/main --include=*Repository.java \| wc -l` |
| [T-040](T-040-scope-cut.md) | LD | 아침 ⓪ 빈칸 세기 → 자르기 결정 · README 실행 절차. | T-033 | `node scripts/check-rubric-p3.mjs` |
| [T-059](T-059-fe-common-check.md) | FS | 공용 컴포넌트 재사용·PropTypes·에러 문구 점검. | T-021 · T-031 | `cd frontend && npm test && npm run build` |
| [T-041](T-041-build-push.md) | DO | 빌드·푸시 워크플로 3개. | T-023 | `(GitHub Actions 화면)` |

## D5 (11/11 수 — EC2 · 2차 통합 · 저녁 기능 동결)

| T | 레인 | 할 일 | 선행 | 확인 |
|---|---|---|---|---|
| [T-042](T-042-ec2-deploy.md) | DO | EC2 배포 · 외부 포트 캡처(I 행 증거). | T-032 · T-041 | `curl -I http://<EC2>/ ; curl -m 3 http://<EC2>:8080` |
| [T-043](T-043-responsive-docs6.md) | FA | 반응형 캡처 3장 + 6번 문서 내 절. | T-030 | `grep -c 'TODO(' docs/6-*` |
| [T-044](T-044-docs5.md) | LD | 5번 Backend 명세 실물 발췌(인증 절). | T-058 | `grep -c 'TODO(' docs/5-*` |
| [T-045](T-045-docs34.md) | BF | 3번·4번 문서 실물 대조. | T-056 | `grep -c 'TODO(' docs/3-* docs/4-*` |
| [T-046](T-046-docs7.md) | AI | 7번 AI 명세 — LangGraph 흐름도·코드·세 조건 표. | T-035 | `grep -c 'TODO(' docs/7-*` |
| [T-047](T-047-ec2-click.md) | LD | EC2에서 전원 클릭 경로 1회 → 버그 티켓. | T-042 | `(smoke.md 체크 결과를 PR 설명에)` |
| [T-048](T-048-gates-docs9.md) | TL | 게이트 무출력 · 9번 본문. | T-034 | `node scripts/check-rubric-p3.mjs && node scripts/check-sec-deploy.mjs` |
| [T-049](T-049-feature-freeze.md) | LD | 저녁 기능 동결 선언 · CI 2단계 필수 전환 요청. | T-047 | `—` |
| [T-060](T-060-docs6-common.md) | FS | 6번 문서 내 절(§5.1 공통 컴포넌트·§6 상태·§7 API 연동). | T-059 | `grep -c 'TODO(' docs/6-*` |
| [T-061](T-061-docs28.md) | DO | 8번 배포 가이드·2번 아키텍처 실물 반영. | T-042 | `grep -c 'TODO(' docs/2-* docs/8-*` |

## D6 (11/12 목 — 버그픽스만 · 리허설 2회 · 제출 게이트)

| T | 레인 | 할 일 | 선행 | 확인 |
|---|---|---|---|---|
| [T-050](T-050-presentation.md) | LD | 발표 35분 자료 · 리허설 2회. | T-049 | `—` |
| [T-051](T-051-demo-gate.md) | TL | 보안 시연 리허설(Burp 순서 고정) · 제출 D-1 게이트. | T-048 | `node scripts/check-rubric-p3.mjs && node scripts/check-sec-deploy.mjs` |
| [T-052](T-052-demo-seed.md) | DO | 데모 시드 재적용 · 발표 10분 전 헬스 · 시연 영상 백업. | T-042 | `curl -I http://<EC2>/` |
| [T-053](T-053-retro.md) | LD | 기여 내역·회고 취합 — 각자 자기 파일은 자기 커밋. | T-050 | `git shortlog -sn --no-merges` |

## 결정 기록 (자르기·일정 변경 — 팀장)

| 날짜 | 결정 | 이유 |
|---|---|---|
|  |  |  |
