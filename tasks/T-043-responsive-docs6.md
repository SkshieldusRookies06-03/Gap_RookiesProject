# T-043 — 반응형 캡처 3장 + 6번 문서 내 절

**담당:** FE-분석 · **브랜치:** `feature/frontend` · **예상:** D5 · **선행:** T-030

## [배경]
SPEC.md §5 반응형 · 6번 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
반응형 캡처 3장 + 6번 문서 내 절.

## [수용 기준]
- [ ] 390·768·1280 캡처 `docs/img/` · `docs/6-` 내 절 TODO 0
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-043` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `docs/6-*` · `docs/img/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-043]` · 전면 재작성 금지

## [확인 명령]
```bash
grep -c 'TODO(' docs/6-*
```
