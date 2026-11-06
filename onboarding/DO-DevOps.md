# 레인 명세 — DevOps (컨테이너 · compose · nginx · CI/CD · EC2)

> 정본은 `SPEC.md` §1 포트·SSE·업로드 행 · §8 DevOps 행 + 스킬 P3-5(배포 레인). 이 문서는 "어떻게"까지 내려간 명세다 — SPEC과 다르면 SPEC이 이긴다. 범위(수정 허용)·수용 기준·확인 명령은 `tasks/T-###-*.md`가 정본이다.
> 내 일의 한 줄: **외부에는 80 하나만 열고, 나머지 셋(backend·ai-service·database)은 compose 내부에서만 이어지게 한다. 배포 20점 + 발표 CI/CD 장.**
> 애플리케이션 코드는 건드리지 않는다. 헬스 경로·포트가 안 맞으면 그 레인 오너에게 넘긴다.

**내 브랜치·흐름** (근거 `onboarding/GitHub규약.md` §1·§3 · SPEC §1 커밋·브랜치 행 · §9)
- 내 브랜치 `feature/infra` — 같은 브랜치를 쓰는 사람 없음(DevOps 혼자). 티켓마다 새 브랜치를 만들지 않는다. 작업 전 `git pull origin feature/infra`.
- push 전 `node seams/check-scope.mjs <내 티켓> origin/feature/infra` 무출력 · `git diff --stat origin/feature/infra...HEAD`로 본 코드 150줄 이하 확인(설정·문서는 본 코드가 아니지만 한 커밋 = 한 의도).
- PR `feature/infra → dev` → 통합 확인 후 `dev → main`. 필수 리뷰·승인·CODEOWNERS 없음(리뷰 요청은 선택 — `ci.yml`·nginx 보안 헤더는 기술 리드에게 공유).

## 0. 검증·증거 표 (자동 판정 테스트 대신 — 명령과 캡처가 점수다)

증거를 **파일로** 남길 수 있는 곳은 그 티켓의 수정 허용뿐이다 — T-032·T-041은 `deploy/`가 허용 밖이라 PR 설명에 붙이고, 파일로 남길 것은 T-042(`deploy/` · `security/evidence/I-*`)에서 커밋한다.

| 무엇 | 언제 · 티켓 | 명령 | 증거(어디에) |
|---|---|---|---|
| compose 문법·변수 | D2부터 매일 · T-023 | `docker compose config -q` | — (무출력) |
| 정적 보안(포트·태그·비밀값) | D2부터 매일 · 전 티켓 | `node scripts/check-sec-deploy.mjs` | — (무출력) |
| 로컬 전체 기동 | D3 · T-032 | `docker compose up -d --build && docker compose ps` | T-032 PR 설명 → T-042에서 `deploy/compose-ps-local.txt` |
| nginx 설정 문법 | D3 · T-032 | `docker compose exec frontend nginx -t` | T-032 PR 설명 |
| 스트림이 시간 간격을 두고 | D3 · T-032 | SPEC §4.3 스트림 검사 curl | T-032 PR 설명 → `deploy/stream-local.txt` |
| 업로드 한도 봉투(nginx 경유) | D3 · T-032 | 300KB 파일 업로드 → 413 **JSON 봉투** | T-032 PR 설명 → `deploy/upload-413.txt` |
| 계약 검사(nginx 경유) | D3 · T-032 | `OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1 node seams/check-api.mjs http://localhost` | T-032 PR 설명 → `deploy/check-api-compose.txt` |
| CSP·보안 헤더 · 캐시 | D3 · T-032 | `curl -sI http://localhost/ \| grep -i -e content-security -e cache-control` (index.html은 `no-cache`) · `curl -sI http://localhost/assets/없는파일.js` → 404 | T-032 PR 설명 → `deploy/csp.txt` |
| GHA build-push green | D4 · T-041 | Actions 화면 | T-041 PR 설명 → 8번 §6(T-061) |
| EC2 외부 80 열림 | D5 · T-042 | `curl -I http://<EC2>/` | `security/evidence/I-3-ec2-80.txt` |
| EC2 외부 8080·8000·3306 막힘 | D5 · T-042 | `curl -m 3 http://<EC2>:8080` · `:8000` · `:3306` | `security/evidence/I-3-ec2-closed.txt` (점검서 I-3·A-1 재확인 증거) |
| 컨테이너 비root | D5 · T-042 | `docker compose exec backend id` · `exec ai-service id` | `security/evidence/I-2-nonroot.txt` |
| (가산) CD 실행 | D5~D6 · 티켓 없음(아래 가산 절) | Actions 화면 | 평가표 R-DP06 캡처 |
| (가산) K8s | D5~D6 · 티켓 없음 | `kubectl get all` | 평가표 R-DP07 캡처 |

`deploy/`와 증거 파일은 만들 것. 캡처·출력에 `.env` 값·키가 보이면 가리고 저장한다. 8번 §5.1은 지금 `security/evidence/I-3.txt` 한 파일을 가리킨다 — T-061에서 실제 파일 이름으로 맞춘다.

## 1. 완료 정의 (D5 저녁)

- [ ] `docker compose config -q` · `node scripts/check-sec-deploy.mjs` 둘 다 무출력
- [ ] 로컬 compose에서 가입 → 업로드 → 분석 스트리밍이 브라우저로 된다(T-032)
- [ ] GHA: CI(`ci.yml`) 1단계 green + build-push 3개 green · 태그 `${{ github.sha }}`
- [ ] EC2 URL로 같은 클릭 경로가 된다 · 외부 포트 캡처 둘(열림 80 · 막힘 8080/8000/3306)
- [ ] `grep -c 'TODO(' docs/2-* docs/8-*` 전부 0(T-061 · 2번 6절 본문은 기술 리드)
- [ ] 데모 시드 재적용 절차가 8번 가이드에 있다
- [ ] D5 저녁 팀장이 T-049에서 `ci.yml` 2단계의 `continue-on-error: true` 세 줄을 지울 때 확인한다(커밋은 팀장 — T-049 수정 허용)

CI 1단계(필수) 목록 — `ci.yml` 실물 기준. 문서·발표에서 "CI 1단계"라고 하면 이것이다:

| job | 1단계 명령 | 2단계(D5까지 red 허용) |
|---|---|---|
| backend (MariaDB 10.11.10 서비스) | `mvn -B test -Dtest='JobgapApplicationTests,PiiMaskerTest,PiiMaskerEdgeTest,GlobalExceptionHandlerTest,CorsConfigTest,JwtProviderTest,PageRequestsTest,ApiResponseJsonTest'` — 기동 + 마스킹 + DB 없는 단위·회귀 6클래스 | `mvn -B test` |
| frontend (Node 20) | `npm ci` → `npm run build && npx vitest run src/api src/components` — 공용 모듈 + 회귀(session·ErrorMessage) | `npm test` |
| ai (Python 3.12 · `astral-sh/setup-uv` + `uv sync --locked`) | `uv run pytest -q tests/test_hardening.py tests/test_contract.py -k "hardening or health or require_token"` — hardening 41 + health·token 2 | `pytest -q` |

트리거: `main`·`dev`·`feature/**` push 및 `dev`·`main` 대상 PR.

## 2. 만들·고칠 파일

| 경로 | 역할 | 티켓(수정 허용 기준) |
|---|---|---|
| `backend/Dockerfile` · `backend/.dockerignore` | 멀티스테이지(maven 3.9.9 → `eclipse-temurin:17-jre-jammy`) · 비root(uid 1001) · HEALTHCHECK(curl `/actuator/health`) · `TZ`·`-Duser.timezone=Asia/Seoul` | T-023 · T-032 |
| `frontend/Dockerfile` | node 20.18 빌드 → `nginx:1.27-alpine` · 빌드 컨텍스트 = 리포 루트 · `VITE_API_URL=""` | T-023 · T-032 |
| `ai-module/Dockerfile` · `ai-module/.dockerignore` | `python:3.12-slim` + `COPY --from=ghcr.io/astral-sh/uv:0.11.32` · `uv sync --locked --no-dev` · `--workers 1` · 비root · HEALTHCHECK(python urllib — slim에 curl 없음) · `tests/`·`eval/`·`.env` 제외 | T-023 · T-032 |
| `.dockerignore`(루트) | frontend 빌드 컨텍스트용 · `.env`·`.env.*` 제외(`!.env.example`) | T-023 |
| `docker-compose.yml` | 서비스 4 · **망 3**(edge·app·data) · 볼륨 2 · 서비스별 env · 기본값 | T-023 · T-032 |
| `docker-compose.dev.yml` | 127.0.0.1 바인드(db 3306 · backend 8080 · ai 8000) | T-023 · T-032 |
| `nginx/default.conf` | SPA fallback · `/api` 프록시 · 스트림 location · `client_max_body_size 1m` · CSP 등 보안 헤더 · `index.html` no-cache · `/assets/` 404 · Docker DNS resolver | T-023 · T-032 |
| `.github/workflows/ci.yml` | 테스트 2단계(D1 골격은 기술 리드 T-001 커밋 · 이후 변경은 T-041 범위 · D5 2단계 전환만 팀장 T-049) | T-041 |
| `.github/workflows/build-{backend,frontend,ai}.yml` | build-push 3개 (만들 것) | T-041 |
| `docs/spikes/ec2.md` | 스파이크③ 결과 (만들 것) | T-008 |
| `deploy/` | EC2 절차 메모·증거 (만들 것) | T-008 · T-042 · T-052 |
| `security/evidence/I-*` | 외부 포트·비root 증거 | T-042 |
| `docs/8-*` · `docs/2-*` | 제출 문서 8번 · 2번(6절 제외) | T-061 |
| `docs/img/` | 시연 캡처·영상 백업 자리 | T-052 |
| `k8s/` | (가산) 매니페스트 3 — **수정 허용 티켓 없음**(가산 절) | — |

안 건드림: `.env.example`(기술 리드 T-001 커밋 · DevOps 티켓 수정 허용에 없다 — 키를 더해야 하면 기술 리드에게) · 애플리케이션 코드(`backend/src`·`frontend/src`·`ai-module/app`) · `application.yml`(헬스·CORS·액추에이터 값은 BE·기술 리드).

## 3. 티켓별 구현 명세

### T-008 스파이크③: EC2 + Docker + nginx Hello 외부 접속 · 인스턴스 타입 결정 (D1 · 선행 —) — `tasks/T-008-spike-ec2.md`
- 수정 허용: `docs/spikes/` · `deploy/`
- 수용 기준 요지: `docs/spikes/ec2.md`에 인스턴스 타입(1GB 금지) · 보안그룹(80 전체·22 내 IP) · 외부 `curl -I` 200 캡처 · temurin jre 이미지 curl 유무 기록.
- 확인 명령:
```bash
curl -I http://<EC2>/
```
- 구현 지침(SPEC §1 포트 행 · 관측 명령 줄):
  1. 인스턴스: Ubuntu 22.04 · **메모리 2GB 이상**(t3.small 이상 — 컨테이너 4개 + Spring 빌드. 1GB 금지 · 스킬 P3-5) · 디스크 20GB. 임베딩은 OpenAI API를 쓰므로 로컬 모델 컨테이너를 넣지 않는다.
  2. 키페어: 새로 만들어 `.pem`을 팀 채널에 올리지 않는다(DevOps·기술 리드만).
  3. 보안그룹 인바운드: **80 = 0.0.0.0/0 · 22 = 내 IP/32만.** 8080·8000·3306은 규칙 자체를 만들지 않는다.
  4. Docker 설치:
```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && newgrp docker
docker compose version
```
  5. Hello: `docker run -d -p 80:80 nginx:1.27-alpine` → 내 PC에서 `curl -I http://<EC2 퍼블릭 IP>/` 200 → 컨테이너 지움.
  6. curl 유무: SPEC §1 관측 명령 `docker run --rm eclipse-temurin:17-jre-jammy sh -c 'command -v curl wget'`(= backend Dockerfile 실행 이미지) → 결과를 `docs/spikes/ec2.md`에(SPEC 파일은 고치지 않는다 · 관측값 기입은 기술 리드에게 전달). 지금 backend Dockerfile은 curl을 직접 설치한다 — T-023에서 이 결과로 설치 줄을 둘지 확정한다.
  - 실패하면: D2에도 계속하고, 막힌 단계를 `docs/spikes/ec2.md`에 그대로 적는다. D4까지 안 되면 강사에게 공개(스킬 P3-6 전환표).
- 커밋: `docs(devops): 스파이크③ EC2 Hello·인스턴스 타입 [T-008]`

### T-023 컨테이너 파일을 점검하고 로컬 config를 통과시킨다 (D2 · 선행 T-008) — `tasks/T-023-containers.md`
- 수정 허용: `backend/Dockerfile` · `frontend/Dockerfile` · `ai-module/Dockerfile` · `docker-compose.yml` · `docker-compose.dev.yml` · `nginx/` · `.dockerignore`
- 수용 기준 요지: `docker compose config -q` · check-sec-deploy 무출력 · **backend HEALTHCHECK curl 확정(T-008 결과)**.
- 확인 명령:
```bash
docker compose config -q && node scripts/check-sec-deploy.mjs
```
- 구현 지침 — 파일은 이미 초안이 있다. **아래를 하나씩 확인하고 고친 뒤 내 이름으로 커밋**:
- `docker-compose.yml`
  - [ ] 외부 `ports`는 frontend `"80:80"` 하나뿐 (I-3)
  - [ ] **망 셋**: `edge`(frontend·backend) · `app`(backend·ai-service — 일반 bridge, **AI가 OpenAI·Tavily로 나가야 한다**) · `data`(backend·database · `internal: true`)
  - [ ] env 최소 권한: OpenAI·Tavily 키는 ai-service에만 · JWT_SECRET·DB 비밀번호는 backend(+database)에만 — `env_file`로 한 벌 돌리지 않는다(A-5)
  - [ ] 필수 비밀값은 `${VAR:?…}`(빈 값이면 기동 거부): `DB_NAME` · `DB_USER` · `DB_PASSWORD` · `DB_ROOT_PASSWORD` · `JWT_SECRET` · `AI_INTERNAL_TOKEN`
  - [ ] **비밀이 아닌 설정은 compose에 기본값**: `CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-http://localhost:5173}` · `ACTUATOR_EXPOSURE: ${ACTUATOR_EXPOSURE:-health,info}` · `SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE:-default}` — `.env`에서 빠지면 빈 문자열이 들어가 Spring 기본값이 무시되고 health가 노출되지 않아 backend unhealthy → frontend가 못 뜬다
  - [ ] ai-service: `LLM_PROVIDER: openai` · `VECTOR_DIR: /data/vector`(FAISS 인덱스 파일 — 볼륨 `vector-data`)
  - [ ] `depends_on: condition: service_healthy` — backend ← database·ai-service, frontend ← backend
  - [ ] 볼륨 둘: `db-data:/var/lib/mysql` · `vector-data:/data/vector`
  - [ ] 이미지 태그 고정(`mariadb:10.11.10`) — `latest` 금지(I-4)
  - [ ] DB `--default-time-zone=+09:00` · `TZ: Asia/Seoul` · utf8mb4 (SPEC §1 시간)
- `docker-compose.dev.yml`: 바인드가 전부 `127.0.0.1:`로 시작하는가(아니면 정적 검사 RED I-3).
- Dockerfile 셋: 멀티스테이지는 backend·frontend · HEALTHCHECK·비root `USER`는 backend·ai(frontend nginx는 HEALTHCHECK 없음) · 실행 이미지 경량·태그 고정(R-DP02) · `.dockerignore`에 `.env`.
- `nginx/default.conf`: 아래 T-032 체크와 같은 항목이 이미 들어 있는지 한 번 읽는다.
- `.env.example` 키가 compose의 `${…}`와 1:1인가(대조만 — 파일은 내 수정 허용 밖): `DB_NAME DB_USER DB_PASSWORD DB_ROOT_PASSWORD JWT_SECRET AI_INTERNAL_TOKEN OPENAI_API_KEY TAVILY_API_KEY CORS_ALLOWED_ORIGINS ACTUATOR_EXPOSURE` (`SPRING_PROFILES_ACTIVE`는 compose 기본값만).
- 커밋: `chore(devops): Dockerfile·compose·dev 바인드 검토 [T-023]`

### T-032 compose 전체 기동 = 1차 통합 E2E (D3 · 선행 T-023 · T-024 · T-025) — `tasks/T-032-compose-e2e.md`
- 수정 허용: `docker-compose.yml` · `docker-compose.dev.yml` · `nginx/` · `backend/Dockerfile` · `frontend/Dockerfile` · `ai-module/Dockerfile`
- 수용 기준 요지: 브라우저 가입 → 업로드 → 분석 스트리밍 · check-api(nginx 경유) green · `docker compose exec frontend nginx -t` OK · 300KB 업로드 413 봉투.
- 확인 명령:
```bash
docker compose up -d --build && OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1 node seams/check-api.mjs http://localhost
```
- 구현 지침(SPEC §1 포트·SSE 설정·업로드 행 · §4.3 스트림 검사). 백엔드가 실물이어야 한다(T-024 · T-025). 체크리스트:
  1. `cp .env.example .env` → 값 채움(`openssl rand -base64 48` JWT · `openssl rand -hex 32` 내부 토큰)
  2. `docker compose up -d --build` → `docker compose ps`: database·ai-service·backend 3개 `healthy` + frontend `running`
  3. 브라우저 http://localhost : 가입 → 로그인 → 공고·이력서 업로드 → 분석 시작 → 토큰이 **흘러나온다**
  4. 계약 검사(nginx 경유) green · `docker compose exec frontend nginx -t` OK
  5. 300KB 파일 업로드 → 413 JSON 봉투(HTML이면 nginx `client_max_body_size 1m` 확인 — Spring 요청 1MB와 짝)
  6. 헤더: CSP·`X-Content-Type-Options`·`Referrer-Policy` · `/index.html` `Cache-Control: no-cache` · 없는 `/assets/…` 404(HTML이 아니라) · 콘솔 에러 0
- nginx 확인 항목(실물 `nginx/default.conf`): 스트림 `location = /api/analyses/stream`에 `proxy_buffering off` · `proxy_read_timeout 310s` · `proxy_http_version 1.1` · `/api/`는 60s · `resolver 127.0.0.11` + `set $backend`(backend만 재생성해도 502 없게) · location 안에 `add_header`를 쓰면 server의 헤더가 상속되지 않으므로 `/index.html` location에 보안 헤더를 다시 적었다.
- 장애 진단 순서(위에서부터):
```bash
docker compose ps                          # 어느 서비스가 unhealthy/restarting 인가
docker compose logs --tail=80 backend      # 기동 예외(JWT_SECRET 길이 · Flyway · DB 연결)
docker compose exec backend curl -s localhost:8080/actuator/health   # 200이어야 — 401이면 SecurityConfig(기술 리드)
docker compose exec backend curl -s ai-service:8000/health           # AI 연결 · 망(app) 확인
curl -sN -X POST http://localhost/api/analyses/stream -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' -d '{"postingId":"1","resumeId":"2"}' | head -20   # 한꺼번에 오면 buffering
```
- 커밋(설정을 고쳤을 때): `fix(devops): compose 통합 기동 수정 [T-032]`

### T-041 빌드·푸시 워크플로 3개 (D4 · 선행 T-023) — `tasks/T-041-build-push.md`
- 수정 허용: `.github/workflows/`
- 수용 기준 요지: `docker/login-action` → `docker/build-push-action` · 태그 `${{ github.sha }}` · paths 필터 · Actions green 캡처.
- 확인 명령:
```bash
(GitHub Actions 화면)
```
- 구현 지침(스킬 P3-5 GHA · 평가표 R-DP04 = build-push ×3 · login-action · github.sha). 레지스트리는 Docker Hub(또는 ECR) 택1 — 8번 가이드 §6에 이름만 적는다(T-061).
- Secrets 이름(값은 GitHub 설정에만): `DOCKERHUB_USERNAME` · `DOCKERHUB_TOKEN` → 2번 §6.4 Secrets 칸 TODO에 이 목록을 넘긴다.
- 트리거는 레인 경로만: backend는 `backend/**`, frontend는 `frontend/**`·`nginx/**`, ai는 `ai-module/**`.
```yaml
# .github/workflows/build-backend.yml (만들 것 · 나머지 둘은 경로·이미지 이름만 다르다)
name: build-backend
on:
  push:
    branches: [main]
    paths: ["backend/**", ".github/workflows/build-backend.yml"]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: ./backend
          push: true
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/jobgap-backend:${{ github.sha }}
```
- frontend는 `context: .` · `file: frontend/Dockerfile`(빌드 컨텍스트가 루트 — nginx 설정을 같이 넣는다).
- 고정 문자열 태그(`latest`) 금지 — 무엇이 배포됐는지 모른다(I-4).
- `ci.yml`은 이 티켓 범위 안이지만 1단계 목록은 기술 리드와 맞춘 것이다 — 고칠 때는 공유한다(§1 표).
- 커밋: `ci(devops): 이미지 빌드·푸시 워크플로 3개 [T-041]`

### T-042 EC2 배포 · 외부 포트 캡처(I 행 증거) (D5 · 선행 T-032 · T-041) — `tasks/T-042-ec2-deploy.md`
- 수정 허용: `deploy/` · `security/evidence/I-*`
- 수용 기준 요지: `.env` 손으로 · `chmod 600` · 외부 80 200 · 8080·8000·3306 실패 · `security/evidence/I-*.txt`.
- 확인 명령:
```bash
curl -I http://<EC2>/ ; curl -m 3 http://<EC2>:8080
```
- 구현 지침(SPEC §1 포트 행 · 점검서 I-1·I-2·I-3·A-1):
  1. EC2에서 리포 클론(또는 compose·nginx 파일만 복사).
  2. `.env`는 **서버에서 손으로** 만든다: `nano .env` → `chmod 600 .env`. CI가 `echo >> .env`로 쓰지 않는다(로그·이력에 남는다). `CORS_ALLOWED_ORIGINS`는 `http://<EC2 주소>`(8번 §4.2).
  3. 기동: `docker compose up -d --build`(또는 T-041 이미지를 쓰도록 compose `image:`를 바꿔 `docker compose pull && docker compose up -d` — compose 수정은 T-032 범위에서 먼저).
  4. 확인·증거(내 PC에서):
```bash
curl -I http://<EC2>/                       > security/evidence/I-3-ec2-80.txt
for p in 8080 8000 3306; do echo ":$p"; curl -m 3 -sS http://<EC2>:$p 2>&1; done > security/evidence/I-3-ec2-closed.txt
```
     - 둘째 파일의 세 줄이 전부 실패(timeout/refused)여야 한다 — 점검서 I-3·A-1 재확인 증거(기술 리드에게 알린다).
     - EC2에서 `docker compose exec backend id` · `docker compose exec ai-service id` → `security/evidence/I-2-nonroot.txt`(uid 1001).
  5. D3 로컬 증거(T-032 PR 설명에 붙였던 것)를 `deploy/`에 파일로 남긴다(§0 표).
  6. 브라우저 클릭 경로 1회는 팀장 T-047(전원 · `seams/smoke.md`)이 EC2 주소로 한다 — URL을 알린다.
- 커밋: `docs(devops): EC2 배포 절차·외부 포트 증거 [T-042]`

### T-061 8번 배포 가이드·2번 아키텍처 실물 반영 (D5 · 선행 T-042) — `tasks/T-061-docs28.md`
- 수정 허용: `docs/2-*` · `docs/8-*`
- 수용 기준 요지: EC2·Secrets·캡처 반영 · TODO 0.
- 확인 명령:
```bash
grep -c 'TODO(' docs/2-* docs/8-*
```
  → 둘 다 0(D1 현재 2번 2 · 8번 2).
- 구현 지침(SPEC §8 DevOps 문서 칸 "8번 · 2번" · 원본은 실물 파일만 — 문서가 파일과 다르면 파일을 발췌한다):
  - 8번 §1~§4: `docker-compose.yml`·Dockerfile 셋·`.env.example`(키 이름만) 발췌 — compose 기본값(`CORS_ALLOWED_ORIGINS`·`ACTUATOR_EXPOSURE`·`SPRING_PROFILES_ACTIVE`)·ai `VECTOR_DIR`가 실물과 같은지.
  - 8번 §5.1: 인스턴스 ID·타입 · **접속 주소 TODO** · 보안그룹 표 · 배포 절차 · 외부 포트 캡처 TODO → T-042 실제 증거 파일 이름(`I-3-ec2-80.txt`·`I-3-ec2-closed.txt`)으로 · 데모 시드 재적용(T-052).
  - 8번 §5.2 K8s: 가산을 안 했으면 "해당 없음" 그대로 · 했으면 매니페스트 3종과 `kubectl create secret generic app-secret --from-env-file=.env`.
  - 8번 §6 CI/CD: 빌드·푸시 3개 "TODO · T-041" 표기를 실물로 · 레지스트리 이름 · Actions 캡처 · `ci.yml` 1단계 목록(§1 표와 같게).
  - 8번 §7 네트워크: 망 셋 표 · nginx 경로(스트림 310s · `index.html` no-cache · `/assets/` 404 · resolver) · 타임아웃 사슬은 SPEC §1 문장 그대로(스트림 실제 상한은 `Flux.timeout(290s)` 하나 — Spring async 300s는 Flux SSE에 걸리지 않는다).
  - 2번 §1~§5(6절 보안은 기술 리드 · T-048): 구성도(망 셋·외부 80 하나) · §3 기술 스택 TODO(Boot 관리 버전 — `./mvnw dependency:tree`에서 Flyway·MariaDB JDBC 재발췌) · §6.4 Secrets 칸 TODO(T-041 Secrets 이름 목록 — 6절이지만 TODO 주인이 DevOps).
- 커밋: `docs(devops): 8번 배포 가이드·2번 아키텍처 실물 반영 [T-061]`

### T-052 데모 시드 재적용 · 발표 10분 전 헬스 · 시연 영상 백업 (D6 · 선행 T-042) — `tasks/T-052-demo-seed.md`
- 수정 허용: `deploy/` · `docs/img/`
- 수용 기준 요지: `SPRING_PROFILES_ACTIVE=seed`로 1회 기동 · 헬스 200.
- 확인 명령:
```bash
curl -I http://<EC2>/
```
- 구현 지침(SPEC §2 시드 · `SeedIngestRunner`):
  - 시드 재적용: `SPRING_PROFILES_ACTIVE=seed docker compose up -d backend` → `docker compose logs backend`에서 적재 로그 확인 → `docker compose up -d backend`(기본 `default`)로 다시 기동.
  - 볼륨까지 처음부터: `docker compose down -v && docker compose up -d --build` → Flyway V1·V2 재적용 → seed 기동. **`-v`는 DB·벡터 볼륨을 전부 지운다**(가입한 계정·업로드 문서 삭제).
  - 발표 10분 전: `curl -I http://<EC2>/` 200 · 분석 1건 스트림 확인 · 시연 영상 백업(`docs/img/` 또는 팀 드라이브).
  - 잔여 위험(SPEC §7): 시드 계정 kim/lee는 공개 비밀번호 — 시연 직후 비밀번호 변경 또는 시연 전용 인스턴스.
- 커밋: `chore(devops): 데모 시드 재적용·발표 전 헬스 [T-052]`

### 가산 — CD · K8s (D5 저녁 빈칸 0일 때만 · 팀장 T-049 허락 후 · 지금 티켓 없음)
- SPEC §8 DevOps "맡는 것"의 `(K8s 가산)` · 평가표 R-DP06(CD 실행 캡처)·R-DP07(`kubectl get all` 캡처). T-049 수용 기준 "빈칸 0이면 DevOps CD·K8s 가산 허락" 뒤 팀장이 티켓을 연다(새 티켓은 팀장 승인) — `k8s/`·CD 워크플로는 그 티켓의 수정 허용으로 커밋한다.
- **CD**: EC2에 self-hosted runner를 설치하고 워크플로가 그 위에서 `docker compose pull && docker compose up -d` — GitHub 호스트 러너에서 `ssh-action`으로 들어가는 방식은 22번을 러너 IP 대역에 열어야 해서 **쓰지 않는다**(보안그룹 규칙과 모순 · 8번 §6). 방식은 ADR 한 줄.
- **K8s**: Minikube · `k8s/`에 매니페스트 셋(Deployment · Service · ConfigMap) · Secret은 파일에 값을 쓰지 않고 명령으로(check-sec-deploy가 설정 파일 속 비밀값 리터럴을 RED로 잡고 이 명령을 조치로 안내한다):
```bash
kubectl create secret generic app-secret --from-env-file=.env
```
  그 명령을 8번 가이드 §5.2에 적는다(Secret의 증거). `kubectl get all` 출력 저장. `.env.example`이 "주석은 줄 단위로"인 이유가 `--from-env-file`이다.

## 4. 받는 것 · 주는 것

| 누구 | 받는 것 | 주는 것 | 언제 |
|---|---|---|---|
| 팀장·BE-기능 | 실물 백엔드 · `/actuator/health` 200 | DB 컨테이너(dev 바인드 `127.0.0.1:3306` — `./mvnw test`용) · 장애 시 `docker compose logs` | D1 · D3 |
| AI | 실물 ai 서버 · `pyproject.toml`·`uv.lock` 변경 알림 | ai Dockerfile · compose env(`LLM_PROVIDER=openai` · `VECTOR_DIR=/data/vector`) · 볼륨 `vector-data` | D2 · D3 |
| FE-화면·FE-분석 | 빌드되는 프론트 | nginx 설정(SPA fallback · 스트림 location · 캐시 규칙) | D3 |
| 기술 리드 | 정적 검사 RED 목록 · 원장 I-행 · `.env.example` 키 · `ci.yml` 1단계 목록 합의 · F-1 CSP(SPEC §7) | 외부 포트·비root 증거 · Secrets 이름 목록 · T-008 관측값(curl 유무) | D1 · D4~D5 |
| 팀장 | 가산 허락(T-049) · 클릭 경로(T-047) · CI 2단계 전환 커밋 확인 요청(T-049) | EC2 URL · 데모 시드·헬스(T-052) | D5 · D6 |
| 전원 | 골든셋 문항 일부(T-011 — DevOps도 나눠 보낸다) | EC2 URL · 장애 시 `docker compose logs` 출력 | D1 · D5 |

## 5. 일정 (BOARD.md · ROADMAP.md와 같다)

| 날 | 할 일 |
|---|---|
| D1 (11/5 목) | T-008 스파이크③(EC2 Hello · 인스턴스 타입 · curl 유무) · T-011 골든셋 문항 보내기 |
| D2 (11/6 금) | T-023 컨테이너 파일 점검·커밋 · `check-sec-deploy` 첫 실행 |
| D3 (11/9 월) | T-032 로컬 compose E2E(1차 통합) |
| D4 (11/10 화) | T-041 build-push 3개 green |
| D5 (11/11 수) | T-042 EC2 배포·외부 포트 캡처 · T-061 8번·2번 문서 · 저녁 CI 2단계 필수 전환(T-049 요청) · (빈칸 0이면) CD·K8s |
| D6 (11/12 목) | T-052 데모 시드·헬스·영상 백업 · 리허설 |

## 6. 막힐 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| frontend가 영영 안 뜸(`waiting`) | backend unhealthy | `docker compose logs backend` · 헬스 401이면 기술 리드(SecurityConfig 순서) · curl 없으면 Dockerfile 설치 줄 |
| backend unhealthy인데 로그엔 기동 완료 | `.env`의 `ACTUATOR_EXPOSURE=`가 빈 값 → health 미노출 | 줄을 지우면 compose 기본값 `health,info` · 빈 값으로 두지 않는다 |
| backend가 기동 즉시 종료 "JWT_SECRET는 32바이트 이상" | `.env` 비어 있음 | `openssl rand -base64 48` |
| Flyway "Unsupported Database" | `flyway-mysql` 누락 | 팀장(BE-인증)에게(`backend/pom.xml` = T-004 수정 허용) |
| AI가 OpenAI에 연결 실패 | ai-service를 internal 망에 넣음 | `app` 망은 일반 bridge(`internal` 없음) |
| ai 이미지 빌드가 `uv sync --locked`에서 실패 | `pyproject.toml`만 바꾸고 `uv.lock`을 안 올림 | AI에게 `uv lock` 결과 커밋 요청(둘은 함께 PR) |
| ai-service 재시작 뒤 업로드했던 문서가 분석에 안 나옴 | 볼륨 없음 · `VECTOR_DIR` 불일치 | `vector-data:/data/vector` 마운트 · env `VECTOR_DIR=/data/vector` |
| 업로드가 HTML 413 | nginx 기본 1MB·설정 누락 | `client_max_body_size 1m`(Spring 요청 1MB와 짝) |
| 스트림이 끝에 한꺼번에 | nginx 버퍼링 | 스트림 location `proxy_buffering off` · `proxy_read_timeout 310s` |
| 스트림이 일찍 끊김 | 타임아웃 불일치 | nginx 310s > WebClient 전체 상한 `Flux.timeout(290s)`(Spring async 300s는 Flux SSE에 걸리지 않는다 · SPEC §1) |
| 재배포 뒤 흰 화면 · 콘솔 MIME 오류 | 옛 `index.html` 캐시가 없는 해시 파일을 찾음 | `index.html` no-cache · `/assets/` `try_files $uri =404`(이미 있음) |
| backend만 다시 만들었더니 502 | nginx가 옛 IP를 기억 | `resolver 127.0.0.11` + `set $backend`(이미 있음) |
| 외부 포트를 80이 아닌 값으로 열었더니 로그인 CORS 403 | Spring이 포트를 80으로 봄 | `CORS_ALLOWED_ORIGINS`에 실제 접속 주소(8번 §7) |
| 시각이 9시간 밀림 | DB·컨테이너 시간대 | DB `--default-time-zone=+09:00` · `TZ=Asia/Seoul` |
| EC2에서 빌드 중 멈춤 | 메모리 1GB | 인스턴스 상향 또는 GHA 이미지 pull |
| `check-sec-deploy` I-3 RED | dev가 아닌 파일에 ports · `127.0.0.1:` 빠짐 | 운영 compose는 frontend만 · dev는 127.0.0.1 |

## 7. 내가 쓰는 문서

| 문서 · 절 | 정본(발췌 원본) | 수정 경로 |
|---|---|---|
| `docs/8-컨테이너배포가이드.md` 전부(§1 구성 · §2 Dockerfile 3 · §3 compose · §4 환경변수 · §5.1 EC2 · §5.2 K8s · §6 CI/CD · §7 네트워크 · §8 체크리스트) | `docker-compose.yml` · Dockerfile 셋 · `nginx/default.conf` · `.env.example`(키 이름만) · 워크플로 · 이 문서 §3 | T-061 |
| `docs/2-시스템아키텍처설계서.md` §1~§5 + §6.4 Secrets 칸 TODO (§6 보안 본문은 기술 리드) | compose 망 셋 · SPEC §1 포트 행 · SPEC §6 내부 계약 · `./mvnw dependency:tree` | T-061 |
| `docs/spikes/ec2.md` | T-008 실측 | T-008 |

## 8. 코딩 에이전트 지시서 예시 (T-041)

```
[배경] 스킬 P3-5 GHA 문단 + 이 문서 §3 T-041 (붙여 넣기)
[목표] .github/workflows/ 에 build-backend.yml · build-frontend.yml · build-ai.yml 을 만든다.
[수용 기준]
- 각각 docker/login-action → docker/build-push-action · 태그 ${{ github.sha }} · paths 필터는 그 레인 폴더만
- frontend는 context: . · file: frontend/Dockerfile
- Secrets 이름은 DOCKERHUB_USERNAME · DOCKERHUB_TOKEN 만 · 값이 파일에 없다
[제약]
- 수정 허용: .github/workflows/ (이번 일은 build-*.yml 셋만 만든다)
- ci.yml 을 고치지 않는다 · commit·push 하지 않는다
[확인 명령] node scripts/check-sec-deploy.mjs && node scripts/check-rubric-p3.mjs | grep R-DP04
[출력] 만든 파일 세 개 전문과 두 명령 출력 그대로(산문 금지)
```

## 10. 내 티켓 전체 (최신 · `tasks/BOARD.md`의 DO 행과 같다 — 위 절과 번호가 다르면 이 표가 이긴다)

150줄 규칙으로 쪼갠 것: 새 **T-061**(2·8번 문서)

| 날 | 티켓 | 할 일 | 선행 |
|---|---|---|---|
| D1 | [T-008](../tasks/T-008-spike-ec2.md) | 스파이크③: EC2 + Docker + nginx Hello 외부 접속 · 인스턴스 타입 결정 | — |
| D2 | [T-023](../tasks/T-023-containers.md) | 컨테이너 파일을 점검하고 로컬 config를 통과시킨다 | T-008 |
| D3 | [T-032](../tasks/T-032-compose-e2e.md) | compose 전체 기동 = 1차 통합 E2E | T-023 · T-024 · T-025 |
| D4 | [T-041](../tasks/T-041-build-push.md) | 빌드·푸시 워크플로 3개 | T-023 |
| D5 | [T-042](../tasks/T-042-ec2-deploy.md) | EC2 배포 · 외부 포트 캡처(I 행 증거) | T-032 · T-041 |
| D5 | [T-061](../tasks/T-061-docs28.md) | 8번 배포 가이드·2번 아키텍처 실물 반영 | T-042 |
| D6 | [T-052](../tasks/T-052-demo-seed.md) | 데모 시드 재적용 · 발표 10분 전 헬스 · 시연 영상 백업 | T-042 |

매일 규칙: `onboarding/README.md` · git: `onboarding/GitHub규약.md` · 화면 눈 검사: `seams/smoke.md` · 하루 끝 3줄: `worklog/<내이름>/D#.md`
