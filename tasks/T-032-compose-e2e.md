# T-032 — compose 전체 기동 = 1차 통합 E2E

**담당:** DevOps · **브랜치:** `feature/devops-T-032` · **예상:** D3 · **선행:** T-023 · T-024 · T-025

## [배경]
SPEC.md §1 · 스킬 P3-8 함정 1 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
compose 전체 기동 = 1차 통합 E2E.

## [수용 기준]
- [ ] `docker compose up -d --build` → 브라우저 가입 → 업로드 → 분석 스트리밍
- [ ] `OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1 node seams/check-api.mjs http://localhost` green
- [ ] `docker compose exec frontend nginx -t` OK · 300KB 업로드 413 봉투
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-032` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `docker-compose.yml` · `docker-compose.dev.yml` · `nginx/` · `backend/Dockerfile` · `frontend/Dockerfile` · `ai-module/Dockerfile`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-032]` · 전면 재작성 금지

## [확인 명령]
```bash
docker compose up -d --build && OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1 node seams/check-api.mjs http://localhost
```
