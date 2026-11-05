# 레인 명세 — DevOps (컨테이너 · compose · nginx · CI/CD · EC2)

> 정본은 `SPEC.md` §1 포트·SSE·업로드 행 + 스킬 P3-5(배포 레인). 이 문서는 "어떻게"까지 내려간 명세다 — SPEC과 다르면 SPEC이 이긴다.
> 내 일의 한 줄: **외부에는 80 하나만 열고, 나머지 셋(backend·ai-service·database)은 compose 내부에서만 이어지게 한다. 배포 20점 + 발표 CI/CD 장.**
> 애플리케이션 코드는 건드리지 않는다. 헬스 경로·포트가 안 맞으면 그 레인 오너에게 넘긴다.

## 0. 검증·증거 표 (자동 판정 테스트 대신 — 명령과 캡처가 점수다)

| 무엇 | 언제 | 명령 | 증거 파일(`security/evidence/` 또는 8번 문서 첨부) |
|---|---|---|---|
| compose 문법·변수 | D2부터 매일 | `docker compose config -q` | — (무출력) |
| 정적 보안(포트·태그·비밀값) | D2부터 매일 | `node scripts/check-sec-deploy.mjs` | — (무출력) |
| 로컬 전체 기동 | D3 | `docker compose up -d --build && docker compose ps` | `deploy/compose-ps-local.txt` |
| 스트림이 시간 간격을 두고 | D3 | 스킬 P3-3 curl(SPEC §4.3 스트림 검사) | `deploy/stream-local.txt` |
| 업로드 한도 봉투(nginx 경유) | D3 | 300KB 파일 업로드 → 413 **JSON 봉투** | `deploy/upload-413.txt` |
| 계약 검사(nginx 경유) | D3 | `OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1 node seams/check-api.mjs http://localhost` | `deploy/check-api-compose.txt` |
| CSP 헤더 | D3 | `curl -sI http://localhost/ \| grep -i content-security` | `deploy/csp.txt` |
| GHA build-push green | D4 | Actions 화면 | `deploy/gha-green.png` |
| EC2 외부 80 열림 | D5 | `curl -I http://<EC2>/` | `security/evidence/I-3-ec2-80.txt` |
| EC2 외부 8080·8000·3306 막힘 | D5 | `curl -m 3 http://<EC2>:8080` · `:8000` · `:3306` | `security/evidence/I-3-ec2-closed.txt` (점검서 I-3·A-1 재확인 증거) |
| 컨테이너 비root | D5 | `docker compose exec backend id` · `exec ai-service id` | `security/evidence/I-2-nonroot.txt` |
| (가산) CD 실행 | D5~D6 | Actions 화면 | `deploy/cd-run.png` |
| (가산) K8s | D5~D6 | `kubectl get all` | `deploy/k8s-get-all.txt` |

`deploy/`와 증거 파일은 만들 것. 캡처·출력에 `.env` 값·키가 보이면 가리고 저장한다.

## 1. 완료 정의 (D5 저녁)

- [ ] `docker compose config -q` · `node scripts/check-sec-deploy.mjs` 둘 다 무출력
- [ ] 로컬 compose에서 가입 → 업로드 → 분석 스트리밍이 브라우저로 된다(T-032)
- [ ] GHA: CI(`ci.yml`) 1단계 green + build-push 3개 green · 태그 `${{ github.sha }}`
- [ ] EC2 URL로 같은 클릭 경로가 된다 · 외부 포트 캡처 둘(열림 80 · 막힘 8080/8000/3306)
- [ ] `docs/8-컨테이너배포가이드.md` FILL 0 · `docs/2-시스템아키텍처설계서.md` FILL 0(6절은 기술 리드)
- [ ] 데모 시드 재적용 절차가 8번 가이드에 있다

## 2. 만들·고칠 파일

| 경로 | 역할 | 티켓 |
|---|---|---|
| `backend/Dockerfile` · `backend/.dockerignore` | 멀티스테이지(maven → temurin 17 jre) · 비root · HEALTHCHECK(curl `/actuator/health`) | T-023 |
| `frontend/Dockerfile` | node 빌드 → nginx · 빌드 컨텍스트 = 리포 루트 · `VITE_API_URL=""` | T-023 |
| `ai-module/Dockerfile` · `ai-module/.dockerignore` | python 3.11 slim · 비root · HEALTHCHECK(python urllib) | T-023 |
| `.dockerignore`(루트) | frontend 빌드 컨텍스트용 | T-023 |
| `docker-compose.yml` | 서비스 4 · 망 3 · 볼륨 2 · 서비스별 env | T-023 · T-032 |
| `docker-compose.dev.yml` | 127.0.0.1 바인드(db 3306 · backend 8080 · ai 8000) | T-023 |
| `nginx/default.conf` | SPA fallback · `/api` 프록시 · 스트림 location · `client_max_body_size 1m` · CSP | T-032 |
| `.github/workflows/ci.yml` | 테스트 2단계(기술 리드 리뷰) | T-023 |
| `.github/workflows/build-{backend,frontend,ai}.yml` | build-push 3개 (만들 것) | T-041 |
| `deploy/` | EC2 절차 메모·증거 (만들 것) | T-042 |
| `k8s/` | (가산) 매니페스트 3 (만들 것 · D5 빈칸 0일 때만) | — |
| `docs/8-*` · `docs/2-*` | 제출 문서 | T-042 · T-023 |

## 3. 티켓별 구현 명세

### T-008 스파이크③ EC2 Hello (D1 · 30분 캡) — BOARD
1. 인스턴스: Ubuntu 22.04 · **메모리 2GB 이상**(t3.small 이상 — 컨테이너 4개 + Spring 빌드. 1GB 금지 · 스킬 P3-5) · 디스크 20GB.
   - 임베딩은 OpenAI API를 쓰므로 Ollama 같은 로컬 모델 컨테이너를 넣지 않는다.
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
6. backend 실행 이미지 확인: `docker run --rm eclipse-temurin:17-jre-jammy sh -c 'command -v curl wget'` — 결과를 SPEC §1 관측 줄 옆에(지금 Dockerfile은 curl을 직접 설치한다 — 있으면 설치 줄을 빼도 된다).
- 실패하면: D2에도 계속하고, 막힌 단계를 8번 가이드 §5.1에 그대로 적는다. D4까지 안 되면 강사에게 공개(스킬 P3-6 전환표).

### T-023 컨테이너 파일 검토·커밋 (D2) — `tasks/T-023-containers.md`
선행: T-008. 파일은 이미 초안이 있다 — **아래를 하나씩 확인하고 고친 뒤 내 이름으로 커밋**.
- `docker-compose.yml`
  - [ ] 외부 `ports`는 frontend `"80:80"` 하나뿐 (I-3)
  - [ ] 망 셋: `edge`(frontend·backend) · `app`(backend·ai-service — 일반 bridge, **AI가 OpenAI·Tavily로 나가야 한다**) · `data`(backend·database · `internal: true`)
  - [ ] env 최소 권한: OpenAI·Tavily 키는 ai-service에만 · JWT_SECRET·DB 비밀번호는 backend(+database)에만 — `env_file`로 한 벌 돌리지 않는다(A-5)
  - [ ] `depends_on: condition: service_healthy` — backend ← database·ai-service, frontend ← backend
  - [ ] 볼륨 둘: `db-data:/var/lib/mysql` · `vector-data:/data/vector`
  - [ ] 이미지 태그 고정(`mariadb:10.11.10`) — `latest` 금지(I-4)
  - [ ] DB `--default-time-zone=+09:00` · `TZ` (SPEC §1 시간)
- `docker-compose.dev.yml`: 바인드가 전부 `127.0.0.1:`로 시작하는가(아니면 정적 검사 RED).
- Dockerfile 셋: 멀티스테이지는 backend·frontend · HEALTHCHECK·비root `USER`는 backend·ai · 실행 이미지 태그 고정 · `.dockerignore`에 `.env`.
- `.env.example` 키가 compose의 `${…}`와 1:1인가: `DB_NAME DB_USER DB_PASSWORD DB_ROOT_PASSWORD JWT_SECRET AI_INTERNAL_TOKEN OPENAI_API_KEY TAVILY_API_KEY CORS_ALLOWED_ORIGINS ACTUATOR_EXPOSURE` (+ `SPRING_PROFILES_ACTIVE`는 기본값 있음).
- 확인: `docker compose config -q && node scripts/check-sec-deploy.mjs`
- 커밋: `chore(devops): Dockerfile·compose·dev 바인드 검토 [T-023]`

### T-032 1차 통합 = 로컬 compose E2E (D3) — `tasks/T-032-compose-e2e.md`
선행: T-023 · T-024 · T-025(백엔드가 실물이어야 한다). 체크리스트:
1. `cp .env.example .env` → 값 채움(`openssl rand -base64 48` JWT · `openssl rand -hex 32` 내부 토큰)
2. `docker compose up -d --build` → `docker compose ps`가 4개 전부 `healthy`(frontend는 running)
3. 브라우저 http://localhost : 가입 → 로그인 → 공고·이력서 업로드 → 분석 시작 → 토큰이 **흘러나온다**
4. 계약 검사(nginx 경유): `OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1 node seams/check-api.mjs http://localhost` green
5. 300KB 파일 업로드 → 413 JSON 봉투(HTML이면 nginx `client_max_body_size` 확인)
6. CSP 헤더 · 콘솔 에러 0

장애 진단 순서(위에서부터):
```bash
docker compose ps                          # 어느 서비스가 unhealthy/restarting 인가
docker compose logs --tail=80 backend      # 기동 예외(JWT_SECRET 길이 · Flyway · DB 연결)
docker compose exec backend curl -s localhost:8080/actuator/health   # 200이어야 — 401이면 SecurityConfig(기술 리드)
docker compose exec backend curl -s ai-service:8000/health           # AI 연결 · 망(app) 확인
curl -sN -X POST http://localhost/api/analyses/stream -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' -d '{"postingId":"1","resumeId":"2"}' | head -20   # 한꺼번에 오면 buffering
```
- 커밋(설정을 고쳤을 때): `fix(devops): compose 통합 기동 수정 [T-032]`

### T-041 빌드·푸시 워크플로 3개 (D4) — `tasks/T-041-build-push.md`
선행: T-023. 레지스트리는 Docker Hub(또는 ECR) 택1 — 8번 가이드 §6에 이름만 적는다.
- Secrets 이름(값은 GitHub 설정에만): `DOCKERHUB_USERNAME` · `DOCKERHUB_TOKEN`
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
- 고정 문자열 태그(`latest`) 금지 — 무엇이 배포됐는지 모른다.
- 커밋: `ci(devops): 이미지 빌드·푸시 워크플로 3개 [T-041]`

### T-042 EC2 배포 (D5) — `tasks/T-042-ec2-deploy.md`
선행: T-032 · T-041.
1. EC2에서 리포 클론(또는 compose·nginx 파일만 복사).
2. `.env`는 **서버에서 손으로** 만든다: `nano .env` → `chmod 600 .env`. CI가 `echo >> .env`로 쓰지 않는다(로그·이력에 남는다).
3. 기동: `docker compose up -d --build`(또는 T-041 이미지를 쓰도록 compose `image:`를 바꿔 `docker compose pull && docker compose up -d`).
4. 확인·증거(내 PC에서):
```bash
curl -I http://<EC2>/                       > security/evidence/I-3-ec2-80.txt
for p in 8080 8000 3306; do echo ":$p"; curl -m 3 -sS http://<EC2>:$p 2>&1; done > security/evidence/I-3-ec2-closed.txt
```
   - 둘째 파일의 세 줄이 전부 실패(timeout/refused)여야 한다 — 이것이 점검서 I-3·A-1 재확인 증거(기술 리드에게 알린다).
5. 브라우저로 클릭 경로 1회(T-047 · 전원).
6. 8번 가이드 §5.1에 위 절차·보안그룹 표·트러블슈팅을 적는다.
- 커밋: `docs(devops): EC2 배포 절차·외부 포트 증거 [T-042]`

### T-052 데모 시드 재적용 · 발표 전 헬스 (D6) — BOARD
- 시드 재적용: `SPRING_PROFILES_ACTIVE=seed docker compose up -d backend` → `docker compose logs backend`에서 적재 로그 확인 → 다시 기본으로 기동.
  - 볼륨을 지우고 처음부터: `docker compose down -v && docker compose up -d --build` → Flyway V1·V2 재적용 → seed.
- 발표 10분 전: `curl -I http://<EC2>/` 200 · 분석 1건 스트림 확인 · 시연 영상 백업.

### 가산 — D5 저녁 빈칸 0일 때만(팀장 T-049 선언 후)
- **CD**: EC2에 self-hosted runner를 설치하고 워크플로가 그 위에서 `docker compose pull && docker compose up -d` — GitHub 호스트 러너에서 `ssh-action`으로 들어가는 방식은 22번을 러너 IP 대역에 열어야 해서 **쓰지 않는다**(보안그룹 규칙과 모순). 방식은 ADR 한 줄.
- **K8s**(+3): Minikube · `k8s/`에 매니페스트 셋(Deployment · Service · ConfigMap) · Secret은 파일에 값을 쓰지 않고 명령으로:
```bash
kubectl create secret generic app-secret --from-env-file=.env
```
  그 명령을 8번 가이드 §5.2에 적는다(Secret의 증거). `kubectl get all` 출력 저장.

## 4. 받는 것 · 주는 것

| 누구 | 받는 것 | 주는 것 | 언제 |
|---|---|---|---|
| BE-인증·BE-기능 | 실물 백엔드 · `/actuator/health` 200 | DB 컨테이너(dev 바인드 3306 — `./mvnw test`용) | D1 · D3 |
| AI | 실물 ai 서버 · requirements 변경 알림 | ai Dockerfile · compose env(`LLM_PROVIDER=openai`·`CHROMA_DIR`) | D2 · D3 |
| 팀장·FE-분석 | 빌드되는 프론트 | nginx 설정(SPA fallback · 스트림 location) | D3 |
| 기술 리드 | 정적 검사 RED 목록 · 원장 I-행 | 외부 포트·비root 캡처 · Secrets 이름 목록 | D4~D5 |
| 전원 | — | EC2 URL · 장애 시 `docker compose logs` 출력 | D5 |

## 5. 일정 (BOARD.md와 같다)

| 날 | 할 일 |
|---|---|
| D1 (11/5) | T-008 스파이크③(EC2 Hello · 인스턴스 타입 · curl 유무) |
| D2 (11/6) | T-023 컨테이너 파일 검토·커밋 · `check-sec-deploy` 첫 실행 |
| D3 (11/9) | T-032 로컬 compose E2E(1차 통합) |
| D4 (11/10) | T-041 build-push 3개 green |
| D5 (11/11) | T-042 EC2 배포·외부 포트 캡처 · 8번 문서 · (빈칸 0이면) CD·K8s |
| D6 (11/12) | T-052 데모 시드·헬스·영상 백업 |

## 6. 막힐 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| frontend가 영영 안 뜸(`waiting`) | backend unhealthy | `docker compose logs backend` · 헬스 401이면 기술 리드(SecurityConfig 순서) · curl 없으면 Dockerfile 설치 줄 |
| backend가 기동 즉시 종료 "JWT_SECRET는 32바이트 이상" | `.env` 비어 있음 | `openssl rand -base64 48` |
| Flyway "Unsupported Database" | `flyway-mysql` 누락 | BE-인증에게(pom) |
| AI가 OpenAI에 연결 실패 | ai-service를 internal 망에 넣음 | `app` 망은 일반 bridge(`internal` 없음) |
| 업로드가 HTML 413 | nginx 기본 1MB·설정 누락 | `client_max_body_size 1m`(Spring 요청 1MB와 짝) |
| 스트림이 끝에 한꺼번에 | nginx 버퍼링 | 스트림 location `proxy_buffering off` · `proxy_read_timeout 300s` |
| 30초쯤 스트림이 끊김 | 타임아웃 불일치 | nginx 300s = Spring `mvc.async.request-timeout` 300s |
| 시각이 9시간 밀림 | DB·컨테이너 시간대 | DB `--default-time-zone=+09:00` · `TZ=Asia/Seoul` |
| EC2에서 빌드 중 멈춤 | 메모리 1GB | 인스턴스 상향 또는 GHA 이미지 pull |
| `check-sec-deploy` I-3 RED | dev가 아닌 파일에 ports · `127.0.0.1:` 빠짐 | 운영 compose는 frontend만 · dev는 127.0.0.1 |

## 7. 내가 쓰는 문서

| 문서 · 절 | 정본(발췌 원본) |
|---|---|
| `docs/8-컨테이너배포가이드.md` 전부(§1 구성 · §2 Dockerfile 3 · §3 compose · §4 환경변수 · §5.1 EC2 · §5.2 K8s · §6 CI/CD · §7 네트워크 · §8 체크리스트) | `docker-compose.yml` · Dockerfile 셋 · `.env.example`(키 이름만) · 워크플로 · 이 문서 §3 |
| `docs/2-시스템아키텍처설계서.md` §1~§5 (§6 보안은 기술 리드) | compose 망 셋 · SPEC §1 포트 행 · SPEC §6 내부 계약 |

## 8. 코딩 에이전트 지시서 예시 (T-041)

```
[배경] 스킬 P3-5 GHA 문단 + 이 문서 §3 T-041 (붙여 넣기)
[목표] .github/workflows/ 에 build-backend.yml · build-frontend.yml · build-ai.yml 을 만든다.
[수용 기준]
- 각각 docker/login-action → docker/build-push-action · 태그 ${{ github.sha }} · paths 필터는 그 레인 폴더만
- frontend는 context: . · file: frontend/Dockerfile
- Secrets 이름은 DOCKERHUB_USERNAME · DOCKERHUB_TOKEN 만 · 값이 파일에 없다
[제약]
- 수정 허용: .github/workflows/build-*.yml
- ci.yml 을 고치지 않는다 · commit·push 하지 않는다
[확인 명령] node scripts/check-sec-deploy.mjs && node scripts/check-rubric-p3.mjs | grep R-DP04
[출력] 만든 파일 세 개 전문과 두 명령 출력 그대로(산문 금지)
```
