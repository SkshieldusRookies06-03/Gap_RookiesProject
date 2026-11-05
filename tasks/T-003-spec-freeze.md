# T-003 — D1 저녁 SPEC 동결 회의를 열고 v1을 승인한다

**담당:** 팀장(BE-인증) · **브랜치:** `feature/lead-T-003` · **예상:** D1 · **선행:** T-001

## [배경]
SPEC.md §9 변경 규약 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
D1 저녁 SPEC 동결 회의를 열고 v1을 승인한다.

## [수용 기준]
- [ ] 전원 소집 · 기술 리드 §2·§4·§6 낭독 10분 · 질문은 '고친다/그대로' 둘 중 하나로 결론
- [ ] SPEC 머리에 `동결 v1 · 2026-11-05` 한 줄 PR 승인
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-003` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `SPEC.md`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-003]` · 전면 재작성 금지
- 참고: 머리 한 줄 외에는 고치지 않는다

## [확인 명령]
```bash
git log -1 --format=%s -- SPEC.md
```
