# T-059 — 공용 컴포넌트 재사용·PropTypes·에러 문구 점검

**담당:** FE-화면 · **브랜치:** `feature/fe-screens-T-059` · **예상:** D4 · **선행:** T-021 · T-031

## [배경]
SPEC.md §5 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
공용 컴포넌트 재사용·PropTypes·에러 문구 점검.

## [수용 기준]
- [ ] 공용 3개 이상이 두 화면 이상에서 쓰임 · PropTypes 전부
- [ ] SPEC §4.4 코드 전부 `ErrorMessage` 문구 있음
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-059` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `frontend/src/components/` · `frontend/src/pages/*.jsx`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-059]` · 전면 재작성 금지

## [확인 명령]
```bash
cd frontend && npm test && npm run build
```
