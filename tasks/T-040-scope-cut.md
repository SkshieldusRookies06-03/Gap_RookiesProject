# T-040 — 아침 ⓪ 빈칸 세기 → 자르기 결정 · README 실행 절차

**담당:** 팀장(BE-인증) · **브랜치:** `feature/backend` · **예상:** D4 · **선행:** T-033

## [배경]
SPEC.md 스킬 P3-6 자르는 순서 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
아침 ⓪ 빈칸 세기 → 자르기 결정 · README 실행 절차.

## [수용 기준]
- [ ] 결정 한 줄을 BOARD D4에 · 자르는 순서 1→5만
- [ ] README 실행 절차(DevOps와)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-040` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `tasks/BOARD.md` · `README.md`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-040]` · 전면 재작성 금지

## [확인 명령]
```bash
node scripts/check-rubric-p3.mjs
```
