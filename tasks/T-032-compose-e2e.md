# T-032 — compose 전체 기동으로 1차 통합 E2E를 만든다

**담당:** DevOps · **브랜치:** `feature/devops-T-032` · **예상:** D3 · **선행:** T-023 · T-024 · T-025

## [배경]
SPEC.md §1 · 스킬 P3-5 · P3-8 함정 1 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
compose 전체 기동으로 1차 통합 E2E를 만든다.

## [수용 기준]
- [ ] `docker compose up -d --build` → http://localhost 에서 가입 → 업로드 → 분석 스트리밍(토큰이 흘러나옴)
- [ ] `node seams/check-api.mjs http://localhost` green(OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1)
- [ ] 200KB 경계 업로드 nginx 경유 봉투 413 관측
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-032` 무출력

## [제약]
- 수정 허용: `docker-compose.yml` · `docker-compose.dev.yml` · `nginx/` · `backend/Dockerfile` · `frontend/Dockerfile` · `ai-module/Dockerfile`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-032]`

## [확인 명령]
```bash
docker compose up -d --build && OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1 node seams/check-api.mjs http://localhost
```
