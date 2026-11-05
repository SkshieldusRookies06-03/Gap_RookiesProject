# T-033 — 저녁 평가표 게이트 → MISS를 D4~D5 티켓으로 배정

**담당:** 기술 리드·보안 · **브랜치:** `feature/security` · **예상:** D3 · **선행:** T-032

## [배경]
SPEC.md 스킬 rubric-p3 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
저녁 평가표 게이트 → MISS를 D4~D5 티켓으로 배정.

## [수용 기준]
- [ ] `security/evidence/rubric-D3.txt` · MISS마다 담당·티켓 · 새 티켓은 팀장 승인
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-033` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `security/evidence/rubric-D3.txt` · `tasks/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-033]` · 전면 재작성 금지

## [확인 명령]
```bash
node scripts/check-rubric-p3.mjs > security/evidence/rubric-D3.txt
```
