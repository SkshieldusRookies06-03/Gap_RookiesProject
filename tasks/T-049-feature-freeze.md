# T-049 — 저녁 기능 동결 선언 · CI 2단계 필수 전환 요청

**담당:** 팀장(BE-인증) · **브랜치:** `feature/backend` · **예상:** D5 · **선행:** T-047

## [배경]
SPEC.md §9 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
저녁 기능 동결 선언 · CI 2단계 필수 전환 요청.

## [수용 기준]
- [ ] 채널 공지 · 이후 `fix:`만
- [ ] `ci.yml` 2단계 `continue-on-error` 세 줄 삭제 → 판정 테스트가 필수 단계가 된다
- [ ] 빈칸 0이면 DevOps CD·K8s 가산 허락
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-049` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `tasks/BOARD.md` · `.github/workflows/ci.yml`(2단계 `continue-on-error` 세 줄 삭제만 — DevOps와 함께 확인)
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-049]` · 전면 재작성 금지

## [확인 명령]
```bash
—
```
