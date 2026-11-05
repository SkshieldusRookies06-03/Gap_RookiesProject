# 티켓 보드 — 7레인 × 6일 (정본: SPEC.md · 일정 골격: 스킬 P3-6)

> 코드 티켓의 지시서(수용 기준·수정 허용·확인 명령)는 `tasks/T-###-*.md` · D1 커밋 순서는 `tasks/D1-SETUP.md` · 레인별 요약은 `onboarding/`.

규칙
- 브랜치 운영의 정본은 SPEC §1 Git 브랜치·병합 운영 규칙. **feature/* → dev → main**.
- 브랜치 `feature/<분야>` · 커밋 `type(범위): 요약 [T-###]` · PR 리뷰 = 부오너(SPEC §8), 계약·보안 파일은 기술 리드 · "완료" = 확인 명령 green.
- **수정 허용** 칸이 비어 있으면 자기 레인 경로(CODEOWNERS)만 고친다. 다른 레인 파일이 필요하면 그 오너에게 티켓을 넘긴다.
- 문서 9종: 파일 오너가 아닌 사람이 쓰는 절(예: 2번 6절 = 기술 리드)은 **그 절을 쓴 사람이 커밋**하고 파일 오너가 리뷰한다(개인 평가 70% = git).
- 전원 매일 1커밋 이상(R-IN01). 하루 티켓이 끝나면 그날 칸의 "여유 시 지정 작업"을 한다.

레인 약칭: **LD** 팀장(BE-인증 레인 겸 운영) · **FS** FE-화면 · **TL** 기술 리드·보안 · **BF** BE-기능 · **AI** · **FA** FE-분석 · **DO** DevOps

## D1 (11/5 목) — 설계 동결 · 목 둘 · 스파이크 셋 · 골격

| T | 레인 | 할 일 | 수정 허용(레인 밖) | 확인 |
|---|---|---|---|---|
| T-001 | TL | SPEC · CODEOWNERS · CLAUDE.md · 원장 · 목 서버 둘 · seam 검사 · scripts 커밋 | — | `node seams/check-api.mjs http://localhost:8080` green(목) |
| T-002 | LD | 팀원 GitHub 아이디 → CODEOWNERS · main 보호(PR 1승인) · README 팀 표 · 1번 계획서 초안 | CODEOWNERS 핸들 줄 | main 직접 푸시가 막힌다 |
| T-003 | LD | **D1 저녁 SPEC 승인 = 동결 v1**(§2·§4·§6 낭독 10분) | SPEC 머리 한 줄 | "동결 v1 · 날짜" |
| T-004 | LD | Spring 골격 — initializr: Web · Security · Data JPA · Validation · Actuator · **Reactive Web(WebClient)** · **MariaDB Driver** · **Flyway** + pom에 `flyway-mysql` 직접 추가 · Maven · JDK 17 · 패키지 `com.jobgap` | backend/ 전체(골격만) | `./mvnw spring-boot:run` + `SELECT VERSION()` = MariaDB |
| T-005 | TL | `common/`(ApiResponse 봉투 · `ErrorCode` enum = SPEC §4.4 · `@RestControllerAdvice` · `include-stacktrace: never`) · `security/JwtProvider`(subject=uuid · HS256) · CORS(환경변수 Origin) — **T-004 직후** | — | 없는 경로 404 봉투 |
| T-006 | BF | 스파이크②: FastAPI 토큰 3개 → Spring `WebClient` 중계 → `curl -N`에 시간 간격 | — | 터미널 캡처 1장 |
| T-007 | AI | 스파이크①: OpenAI 응답 1 + 임베딩 1 · `mock_app.py` 실행 확인 · requirements.txt 버전 고정 | — | `MOCK=1 node seams/check-ai.mjs` green |
| T-008 | DO | 스파이크③: EC2 + Docker + nginx Hello 외부 접속 · 인스턴스 타입 결정(1GB 금지) · temurin curl 유무 확인 | — | 외부 `curl -I http://<EC2>/` 200 |
| T-009 | FS | Vite React 골격 · `routes.js` · `api/client.js`(봉투 벗기기 · `TOKEN_EXPIRED`만 refresh · **`streamPost()` export**) · 공용 Button·Layout·LoadingSpinner(`PropTypes`) · `styles/tokens.css`(브레이크포인트 768·1280) | — | 목으로 로그인 화면이 뜬다 |
| T-010 | FA | 분석 화면 와이어(종이 1장) → SPEC §4.3 대조 · `useChatStream` 뼈대(`streamPost` + `getReader()`) | — | 목 스트림 토큰이 콘솔에 순서대로 |
| T-011 | 전원(오너 AI) | 골든셋 공고 10개 + **가짜** 이력서 3개 → `ai-module/eval/data/` · 문항 10개(그중 3개는 기업 최신 정보) + 정답 | ai-module/eval/data/ | 파일 13개 + `questions.md` |

## D2 (11/6 금) — 모듈 단독 동작 · 방어는 별도 커밋

| T | 레인 | 할 일 | 수정 허용 | 확인 |
|---|---|---|---|---|
| T-012 | BF | Flyway `V1__schema.sql`(테이블 4 · UNIQUE 3 · FK RESTRICT) · `V2__seed.sql`(SPEC §2 시드: kim·lee 각 공고1·이력서1 · lee의 분석1+메시지2) · `ddl-auto: validate` · `spring.jackson.time-zone` | — | 빈 DB 기동 green |
| T-013 | BF | Document·Analysis·AnalysisMessage 엔티티(`@Table`·`@Column`·LAZY · messages만 양방향 cascade) · Repository(메서드 이름 쿼리 1 + `@Query` 1) | — | 기동 |
| T-014 | BF | 문서 API 5 — **소유자 검증 없이 먼저**(S-01 조치 전 상태) · 정렬·type 허용 목록 · `@Transactional`은 서비스에만(조회 readOnly) | — | check-api 문서 행(403 행 제외) green |
| T-015 | LD | User 엔티티 · register/login/refresh/logout · BCrypt · refresh SHA-256 해시·회전 · `@Valid`(`@Pattern`·`@Size`·`@NotBlank`) | — | check-api 인증·refresh 행 green |
| T-016 | TL | SecurityConfig(`/actuator/health` permitAll **위**, `/actuator/**` ADMIN · ASYNC/ERROR permitAll · CSRF 비활성 + 사유 · CSP `default-src 'none'`) · JWT 필터 · 401 EntryPoint/403 Handler 로그 · `@PreAuthorize` 템플릿 · `ACTUATOR_EXPOSURE` | — | 토큰 없는 요청 401 봉투 |
| T-017 | TL | `PiiMasker` + 단위 테스트(§6.5 네 종) — **연결은 D3**(S-03 조치 전 상태 확보) | — | `./mvnw test` |
| T-018 | AI | `app.py`: ingest(Chroma · 메타 4 · 멱등) · delete · health · `Header(alias="X-Internal-Token")` · `pytest` 1(토큰 401 + owner 필터) | — | `node seams/check-ai.mjs` ingest·delete·401 green · `pytest` |
| T-019 | AI | analyze/stream RAG 단일 경로(REPORT: load → generate) · token JSON 인코딩 | — | check-ai 스트림 행 green |
| T-020 | FS | 로그인·가입 · authStore(persist partialize · refresh는 `navigator.locks`) · 보호 라우트 | — | 목으로 로그인 → /documents |
| T-021 | FS | 내 문서(탭·페이징·정렬·업로드·제목 수정·삭제 · 상태 넷) · **`useUpload` 훅** | — | 목으로 클릭 경로 |
| T-022 | FA | 분석 화면: 선택 → 스트리밍 렌더 → 중단(AbortController) · chatStore · 텍스트 렌더 · `@media` 768·1280 | — | 목으로 리포트가 흘러나온다 |
| T-023 | DO | Dockerfile 3(backend·frontend 멀티스테이지 · backend·ai HEALTHCHECK·비root · 태그 고정) · compose(망 3 · 서비스별 env · `TZ=Asia/Seoul` · volume 2) · `docker-compose.dev.yml` | — | `docker compose config` · `node scripts/check-sec-deploy.mjs` 무출력 |

## D3 (11/9 월) — 1차 통합 = 로컬 compose 전체 E2E

| T | 레인 | 할 일 | 수정 허용 | 확인 |
|---|---|---|---|---|
| T-024 | BF | AI 클라이언트(RestClient connect 3s·read 30s · WebClient 290s · `onErrorResume` → `AI_UNAVAILABLE`) · 업로드 순서(§1: 저장 → 트랜잭션 끝 → ingest → 실패 시 삭제) · 삭제 순서 §6.4 | — | AI 끈 상태 업로드 503 봉투 캡처 |
| T-025 | BF | analyses/stream 중계(§4.3 중계 규칙 · done 가로채 저장 후 messageId) · 목록(lastStatus 파생)·메시지 페이징 | — | 스트림 검사 + check-api 스트림 행 |
| T-026 | BF | `fix(security): [S-01] 소유 검증 · B-2` — 문서·분석 서비스 + **IDOR 403 회귀 테스트** (TL이 조치 전 커밋에서 먼저 재현) | — | check-api 403 행 green |
| T-027 | LD | `fix(security): [S-02] 로그인 5회 잠금 · B-5`(`lockedUntil` · 존재 계정만) + 잠금 테스트 · `SeedIngestRunner`(프로파일 seed · 전 문서 delete→ingest · BF의 AI 클라이언트 사용) | `backend/.../seed/`(BF 리뷰) | 6회째 423 · seed 기동 후 시드 문서로 분석 스트림 |
| T-028 | TL | 감사 리스너(`AuthenticationSuccessEvent`/`Failure`) · 이메일 `mask…()` · `fix(security): [S-03] PiiMasker 연결 · A-3` | DocumentService·AnalysisService 호출 1줄씩(BF 리뷰) | 상세 응답 마스킹 · `maskedCount` |
| T-029 | AI | LangGraph: load → grade → [Tavily] → generate · FOLLOWUP은 `as_retriever` + relevance score 분기 · sources type web | — | 기업 질문에 web 출처 |
| T-030 | FA | 후속 질문 · 출처 칩 · 분석 기록에서 재진입 · 분석 화면 상태 테스트 1(`pages/analysis/AnalysisPage.test.jsx` — 내 테스트) | — | `npm test` |
| T-031 | FS | 분석 기록 화면(INCOMPLETE "중단됨") · 화면 상태 테스트 1 | — | `npm test` |
| T-032 | DO | compose 전체 기동 · nginx(SPA fallback · `/api` 프록시 · 스트림 buffering off·300s · `client_max_body_size 1m` · CSP) | — | **E2E: 가입 → 업로드 → 분석 스트리밍(브라우저)** |
| T-033 | TL | 저녁 `node scripts/check-rubric-p3.mjs` → MISS를 D4~D5 티켓으로 배정 | — | MISS 목록 |

## D4 (11/10 화) — 동적 점검 · 중간 검증 · GHA

| T | 레인 | 할 일 | 수정 허용 | 확인 |
|---|---|---|---|---|
| T-034 | TL | 동적 점검일: 원장 31행 · Burp(S-01·S-02) · SBOM → `security/evidence/bom.json` · npm audit | — | `check-rubric-p3` R-SE10~12 |
| T-035 | AI | 골든셋 × 세 조건 → `ai-module/eval/result.md` · 기준값 0.45 조정(바꾸면 SPEC §1 PR) | — | 결과 표 |
| T-036 | AI | 예비 A-2 재현 → 자료 구분자 조치(발견이면 `fix(security): [S-04]`) | — | 원장 A-2 |
| T-037 | LD | 400 경계 정리: size=0·정수 아님·JSON 형식 오류·빈 파일·UTF-8 아님 → 봉투(§4.4) · 인증 테스트 보강 | GlobalExceptionHandler 매핑 줄(TL 리뷰) | 각 요청 400/415 봉투 |
| T-038 | BF | 500 경로 점검(삭제 중 AI 실패 · 스트림 중 AI 다운 → event: error) · N+1 확인(`open-in-view=false`) | — | AI 중지 캡처 |
| T-039 | FA | 스트림 error 이벤트 UI(`messageFor(error)` 사용 · 재시도 버튼) · XSS 재현 보조(F-1) | — | 화면 캡처 |
| T-040 | LD·FS | 아침 ⓪ 빈칸 세기 · 자르기 결정(LD) · README 실행 절차(LD) · 화면 공용 컴포넌트 재사용 확인 | — | 회의 10분 |
| T-041 | DO | GHA 3개(`docker/login-action` · `build-push-action` · `${{ github.sha }}` 태그) green | — | Actions 화면 |

## D5 (11/11 수) — EC2 · 2차 통합 · 저녁 기능 동결

| T | 레인 | 할 일 | 수정 허용 | 확인 |
|---|---|---|---|---|
| T-042 | DO | EC2 배포 · 외부 80만 열림 캡처(8080·8000·3306 실패) · 8번 가이드 | — | `curl -m 3` 캡처 |
| T-043 | FA | 반응형 캡처 3장(분석 화면 390·768·1280) · 6번 문서 | — | 6번 §8 |
| T-044 | LD | 5번 백엔드 명세 실물 발췌(엔티티 규약 표 · CSRF 사유 문장) | — | FILL 0 |
| T-045 | BF | 3번·4번 문서 실물 대조(DDL · 엔드포인트 12 · 에러 표) | — | FILL 0 |
| T-046 | AI | 7번 AI 명세(LangGraph 흐름도 + 코드 · 세 조건 표) | — | FILL 0 |
| T-047 | 전원 | EC2에서 클릭 경로 1회 · 버그 티켓 | — | — |
| T-048 | TL | `check-rubric-p3` 무출력 · `--human` 목록 캡처 · `check-sec-deploy` 무출력 · 9번 본문 | — | 두 스크립트 exit 0 |
| T-049 | LD | **저녁 기능 동결** · (빈칸 0이면) DO가 CD·K8s 가산 | — | — |

## D6 (11/12 목) — 버그픽스만 · 리허설 2회 · 제출 게이트

| T | 레인 | 할 일 | 확인 |
|---|---|---|---|
| T-050 | LD | 발표 자료(35분 · 보안 시연 · CI/CD 흐름 · 수치는 명령 근거만) · 리허설 2회 | 타이머 |
| T-051 | TL | 보안 시연 리허설(Burp 순서 고정) · 제출 D-1 게이트(스킬 submission-docs-p3 §3) | 게이트 9항목 |
| T-052 | DO | 데모 시드 재적용(`SPRING_PROFILES_ACTIVE=seed`) · 발표 10분 전 헬스 · 시연 영상 백업 | 헬스 200 |
| T-053 | 전원 | 기여 내역·회고 각자 커밋 · 발표 Q&A 자기 파트 한 줄 | `git shortlog -sn` |
