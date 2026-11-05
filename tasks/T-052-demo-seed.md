# T-052 — 데모 시드 재적용 · 발표 10분 전 헬스 · 시연 영상 백업

**담당:** DevOps · **브랜치:** `feature/infra` · **예상:** D6 · **선행:** T-042

## [배경]
SPEC.md §2 시드 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
데모 시드 재적용 · 발표 10분 전 헬스 · 시연 영상 백업.

## [수용 기준]
- [ ] `SPRING_PROFILES_ACTIVE=seed`로 1회 기동 · 헬스 200
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-052` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `deploy/` · `docs/img/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-052]` · 전면 재작성 금지

## [확인 명령]
```bash
curl -I http://<EC2>/
```
