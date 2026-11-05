# T-002 — GitHub 리포 설정과 팀 핸들을 확정한다

**담당:** 팀장(BE-인증) · **브랜치:** `feature/lead-T-002` · **예상:** D1 · **선행:** T-001

## [배경]
SPEC.md §8 · onboarding/GitHub규약.md — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
GitHub 리포 설정과 팀 핸들을 확정한다.

## [수용 기준]
- [ ] CODEOWNERS 핸들 7개 → 실제 GitHub 아이디
- [ ] main 보호: PR 필수 · 승인 1 · Code Owners 리뷰 · 직접 푸시 금지 · 머지 방식 'Create a merge commit'만 허용
- [ ] README 팀 표 · `docs/1-` 팀원 실명
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-002` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `.github/CODEOWNERS` · `README.md` · `docs/1-*`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-002]` · 전면 재작성 금지

## [확인 명령]
```bash
(GitHub Settings 화면 캡처를 PR 설명에)
```
