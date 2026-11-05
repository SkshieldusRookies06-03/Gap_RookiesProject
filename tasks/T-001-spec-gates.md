# T-001 — 설계 정본·목 서버 둘·seam 검사·판정 테스트·원장·역할 문서를 리포에 둔다

**담당:** 기술 리드·보안 · **브랜치:** `feature/security` · **예상:** D1 · **선행:** —

## [배경]
SPEC.md §0~§10 전체 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
설계 정본·목 서버 둘·seam 검사·판정 테스트·원장·역할 문서를 리포에 둔다.

## [수용 기준]
- [ ] `node mock/server.mjs` + `node seams/check-api.mjs http://localhost:8080` green 20줄
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-001` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `SPEC.md` · `CLAUDE.md` · `mock/` · `seams/` · `scripts/` · `security/` · `tasks/` · `onboarding/` · `docs/` · `.github/` · `worklog/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-001]` · 전면 재작성 금지
- 참고: 이미 완료 — 이후 이 파일들의 변경은 SPEC §9 규약

## [확인 명령]
```bash
node scripts/check-sec-deploy.mjs
```
