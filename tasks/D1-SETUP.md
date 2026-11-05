# D1 셋업 — 누가 무엇을 어떤 순서로 커밋하나 (11/5 · 오전 안에 끝낸다)

> **실제 진행: 기술 리드가 전체를 한 커밋으로 올렸다.** 아래 §1 순서표는 참고용이다 — T-004·T-009·T-010·T-012·T-023은
> "팩 커밋" 대신 **각 오너가 자기 경로를 검토·실행 확인**하는 티켓으로 읽는다(확인 명령은 그대로). §2 오전 확인 표는 그대로 쓴다.

이 zip에는 7개 레인의 시작 파일이 다 들어 있다. **한 사람이 통째로 올리지 않는다** — 개인 평가 70%가 git이라,
각자 자기 레인 경로만 자기 계정으로 커밋한다(CODEOWNERS와 같은 경로). 순서는 컴파일이 깨지지 않는 순서다.

## 0. 준비 (기술 리드)
1. GitHub에 빈 리포 `jobgap` 생성 · 팀원 7명 초대
2. zip을 리포 밖 `../jobgap-d1/`에 풀어 둔다 — 아래 명령은 전부 이 폴더에서 **리포로 복사**한다
3. 공유: 이 파일 · `onboarding/<내 레인>.md` · 각자 노트북에 Node 20 · JDK 17 · Python 3.11 · Docker

## 1. 커밋 순서 (PR 하나씩 · 앞 PR이 main에 들어간 뒤 다음)

| # | 누가 | 복사할 경로 (`../jobgap-d1/` → 리포) | 커밋 메시지 |
|---|---|---|---|
| 1 | 기술 리드 | `SPEC.md README.md CLAUDE.md .gitignore .env.example .github/CODEOWNERS .github/PULL_REQUEST_TEMPLATE.md mock/ seams/ scripts/ security/ tasks/ onboarding/ docs/` | `chore(setup): 설계 정본·목·게이트·원장 [T-001]` |
| 2 | 팀장 | (리포 설정만) CODEOWNERS 핸들 교체 · main 보호(PR 1승인 · 직접 푸시 금지) · README 팀 표 | `chore(setup): 팀 핸들·보호 규칙 [T-002]` |
| 3 | 팀장(BE-인증) | `backend/pom.xml backend/src/main/resources/application.yml backend/src/main/java/com/jobgap/JobgapApplication.java` + start.spring.io에서 받은 `mvnw mvnw.cmd .mvn/` | `chore(be): Spring 골격 [T-004]` |
| 4 | 기술 리드 | `backend/src/main/java/com/jobgap/common/ backend/src/main/java/com/jobgap/security/ backend/src/test/` | `feat(security): 공통 봉투·보안 설정·판정 테스트 [T-005]` |
| 5 | 팀장(BE-인증) | `backend/src/main/java/com/jobgap/auth/ backend/src/main/java/com/jobgap/seed/` | `chore(auth): 인증 API 골격 [T-004]` |
| 6 | BE-기능 | `backend/src/main/java/com/jobgap/document/ backend/src/main/java/com/jobgap/analysis/ backend/src/main/java/com/jobgap/ai/ backend/src/main/resources/db/` | `chore(be): 문서·분석·AI 클라이언트 골격 + Flyway [T-012]` |
| 7 | FE-화면 | `frontend/` 에서 **아래 셋을 뺀 전부**: `src/pages/analysis/ src/hooks/useChatStream.js src/stores/chatStore.js` · 판정 테스트 둘(`src/hooks/useChatStream.test.jsx` `src/pages/DocumentsPage.test.jsx`) | `chore(fe): 프론트 골격 [T-009]` |
| 8 | FE-분석 | `frontend/src/pages/analysis/ frontend/src/hooks/useChatStream.js frontend/src/stores/chatStore.js` | `chore(fe): 분석 화면 골격 [T-010]` |
| 9 | 기술 리드 | `frontend/src/hooks/useChatStream.test.jsx frontend/src/pages/DocumentsPage.test.jsx ai-module/tests/ ai-module/pytest.ini` | `test: 프론트·AI 판정 테스트(red 시작) [T-005]` |
| 10 | AI | `ai-module/app/ ai-module/eval/ ai-module/mock_app.py ai-module/requirements.txt` | `chore(ai): FastAPI 골격·목 [T-007]` |
| 11 | DevOps | `docker-compose.yml docker-compose.dev.yml .dockerignore nginx/ .github/workflows/ backend/Dockerfile backend/.dockerignore frontend/Dockerfile ai-module/Dockerfile ai-module/.dockerignore` | `chore(devops): 컨테이너·CI 골격 [T-023]` |

7번과 8번 사이에는 프론트 빌드가 깨진다(App.jsx가 분석 화면을 import) — 8번을 바로 이어서 머지한다.

복사 예 (팀장 · BE-인증 3번):
```bash
cd jobgap && git switch -c feature/be-auth-T-004
cp ../jobgap-d1/backend/pom.xml backend/ 2>/dev/null || (mkdir -p backend && cp ../jobgap-d1/backend/pom.xml backend/)
mkdir -p backend/src/main/resources backend/src/main/java/com/jobgap
cp ../jobgap-d1/backend/src/main/resources/application.yml backend/src/main/resources/
cp ../jobgap-d1/backend/src/main/java/com/jobgap/JobgapApplication.java backend/src/main/java/com/jobgap/
git add backend && git commit -m "chore(be): Spring 골격 [T-004]" && git push -u origin HEAD   # → PR
```

## 2. 오전 확인 (각자 · 결과를 채널에 한 줄)

| 누가 | 명령 | 기대 |
|---|---|---|
| 전원 | `node mock/server.mjs` + `node seams/check-api.mjs http://localhost:8080` | green 20줄 |
| BE 둘 · 기술 리드 | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d database` → `cd backend && ./mvnw test -Dtest='JobgapApplicationTests,PiiMaskerTest'` | green (`.env`의 DB_PASSWORD=jobgap 또는 `TEST_DB_PASSWORD`) |
| 프론트 둘 | `cd frontend && npm ci && npx vitest run src/api` | 9 passed |
| AI | `cd ai-module && pip install -r requirements.txt && pytest -q` | 2 passed · 5 failed(판정 — 내가 green으로 만든다) |
| DevOps | `docker compose config -q && node scripts/check-sec-deploy.mjs` | 무출력 |
| 기술 리드 | `node seams/check-scope.mjs --owners` | 무출력 |

## 3. 판정 테스트 현황 (D1 시작 시점 — 이게 정상이다)

| 레인 | 판정 테스트 | 시작 | green으로 만드는 티켓 |
|---|---|---|---|
| 팀장(BE-인증) | `AuthAcceptanceTest` 6 | red | T-015 · T-027 |
| BE-기능 | `DocumentAcceptanceTest` 7 · `AnalysisAcceptanceTest` 6 | red | T-014 · T-024 · T-025 · T-026 |
| 기술 리드 | `SecurityAcceptanceTest` 3 · `PiiMaskerTest` 3 | green 목표(D1) | T-005 · T-016 · T-017 |
| FE-화면 | `api/*.test.js` 9 · `DocumentsPage.test.jsx` 4 | green · red | T-009 · T-021 |
| FE-분석 | `useChatStream.test.jsx` 4 | red | T-022 |
| AI | `tests/` 7 | 2 green · 5 red | T-018 · T-019 |

CI(`.github/workflows/ci.yml`)는 1단계(컴파일·기동·공용)만 필수, 판정은 2단계 현황판(red 허용). **D5 아침에 2단계의
`continue-on-error` 세 줄을 지운다**(기술 리드).

검증 경계(정직하게): 프론트·AI 판정 테스트는 참조 구현으로 **전부 green이 되는 것까지 확인**했다. 백엔드 Java는 작성 환경에서
Maven Central이 막혀 **컴파일 전**이다 — 3·4번 커밋 직후 `./mvnw test`에서 처음 컴파일된다. 에러는 출력 전체를 기술 리드에게.
