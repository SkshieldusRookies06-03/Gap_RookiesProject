# T-023 — 컨테이너 파일을 점검하고 로컬 config를 통과시킨다

**담당:** DevOps · **브랜치:** `feature/devops-T-023` · **예상:** D2 · **선행:** T-008

## [배경]
SPEC.md §1 포트 · 스킬 P3-5 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
컨테이너 파일을 점검하고 로컬 config를 통과시킨다.

## [수용 기준]
- [ ] `docker compose config -q` · `node scripts/check-sec-deploy.mjs` 무출력
- [ ] backend HEALTHCHECK curl 확정(T-008 결과)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-023` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/Dockerfile` · `frontend/Dockerfile` · `ai-module/Dockerfile` · `docker-compose.yml` · `docker-compose.dev.yml` · `nginx/` · `.dockerignore`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-023]` · 전면 재작성 금지

## [확인 명령]
```bash
docker compose config -q && node scripts/check-sec-deploy.mjs
```
