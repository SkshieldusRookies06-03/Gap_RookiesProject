# T-038 — 500 경로 점검(삭제 중 AI 실패 · 스트림 중 AI 다운) · N+1 확인

**담당:** BE-기능 · **브랜치:** `feature/be-feature-T-038` · **예상:** D4 · **선행:** T-025

## [배경]
SPEC.md §4.4 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
500 경로 점검(삭제 중 AI 실패 · 스트림 중 AI 다운) · N+1 확인.

## [수용 기준]
- [ ] AI 컨테이너 중지 상태 업로드·삭제 503 봉투 · 스트림 event: error 캡처
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-038` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/document/` · `backend/src/main/java/com/jobgap/analysis/` · `backend/src/main/java/com/jobgap/ai/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-038]` · 전면 재작성 금지

## [확인 명령]
```bash
docker compose stop ai-service && OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1 node seams/check-api.mjs http://localhost
```
