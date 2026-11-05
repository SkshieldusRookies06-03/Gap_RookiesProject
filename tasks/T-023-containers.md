# T-023 — Dockerfile 3·compose·dev compose·nginx·CI 팩을 커밋하고 로컬에서 config가 통과하게 한다

**담당:** DevOps · **브랜치:** `feature/infra` · **예상:** D2 · **선행:** T-008

## [배경]
SPEC.md §1 포트 · 스킬 P3-0.1 compose·Dockerfile 행 · P3-5 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
Dockerfile 3·compose·dev compose·nginx·CI 팩을 커밋하고 로컬에서 config가 통과하게 한다.

## [수용 기준]
- [ ] `docker compose config` 통과 · `node scripts/check-sec-deploy.mjs` 무출력
- [ ] temurin jre 이미지 curl 유무를 확인해 backend HEALTHCHECK 줄 확정(T-008 결과)
- [ ] .env.example 키가 compose의 `${…}`와 1:1
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-023` 무출력

## [제약]
- 수정 허용: `backend/Dockerfile` · `backend/.dockerignore` · `frontend/Dockerfile` · `ai-module/Dockerfile` · `ai-module/.dockerignore` · `.dockerignore` · `docker-compose.yml` · `docker-compose.dev.yml` · `nginx/` · `.github/workflows/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-023]`

## [확인 명령]
```bash
docker compose config -q && node scripts/check-sec-deploy.mjs
```
