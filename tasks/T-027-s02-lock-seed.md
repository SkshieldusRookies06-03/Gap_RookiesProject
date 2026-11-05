# T-027 — `fix(security): [S-02] 로그인 5회 잠금 · B-5 [T-027]` + SeedIngestRunner

**담당:** 팀장(BE-인증) · **브랜치:** `feature/lead-T-027` · **예상:** D3 · **선행:** T-015 · 기술 리드 재현

## [배경]
SPEC.md §7 S-02 · §2 시드 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
`fix(security): [S-02] 로그인 5회 잠금 · B-5 [T-027]` + SeedIngestRunner.

## [수용 기준]
- [ ] `AuthAcceptanceTest` ⑤·(지킴) green · `noRollbackFor = BusinessException.class`
- [ ] SeedIngestRunner: seed 프로파일 · `@Transactional(readOnly = true)` · BF의 리포지토리·AiClient는 호출만
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-027` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/auth/` · `backend/src/main/java/com/jobgap/user/` · `backend/src/main/java/com/jobgap/seed/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-027]` · 전면 재작성 금지

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=AuthAcceptanceTest
```
