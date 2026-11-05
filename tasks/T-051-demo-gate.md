# T-051 — 보안 시연 리허설(Burp 순서 고정) · 제출 D-1 게이트

**담당:** 기술 리드·보안 · **브랜치:** `feature/security` · **예상:** D6 · **선행:** T-048

## [배경]
SPEC.md §7 · 제출 게이트 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
보안 시연 리허설(Burp 순서 고정) · 제출 D-1 게이트.

## [수용 기준]
- [ ] 스킬 submission-docs-p3 §3 9항목
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-051` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `security/` · `docs/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-051]` · 전면 재작성 금지

## [확인 명령]
```bash
node scripts/check-rubric-p3.mjs && node scripts/check-sec-deploy.mjs
```
