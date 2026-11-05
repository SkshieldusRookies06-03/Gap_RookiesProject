# T-060 — 6번 문서 내 절(§5.1 공통 컴포넌트·§6 상태·§7 API 연동)

**담당:** FE-화면 · **브랜치:** `feature/fe-screens-T-060` · **예상:** D5 · **선행:** T-059

## [배경]
SPEC.md 6번 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
6번 문서 내 절(§5.1 공통 컴포넌트·§6 상태·§7 API 연동).

## [수용 기준]
- [ ] 내 절 TODO 0
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-060` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `docs/6-*`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-060]` · 전면 재작성 금지

## [확인 명령]
```bash
grep -c 'TODO(' docs/6-*
```
