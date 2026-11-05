# T-048 — 게이트 무출력 · 9번 본문

**담당:** 기술 리드·보안 · **브랜치:** `feature/security` · **예상:** D5 · **선행:** T-034

## [배경]
SPEC.md 9번 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
게이트 무출력 · 9번 본문.

## [수용 기준]
- [ ] `check-rubric-p3` 무출력 · `--human` 캡처 · `check-sec-deploy` 무출력
- [ ] `docs/9-` TODO 0
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-048` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `docs/9-*` · `security/` · `docs/2-*`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-048]` · 전면 재작성 금지

## [확인 명령]
```bash
node scripts/check-rubric-p3.mjs && node scripts/check-sec-deploy.mjs
```
