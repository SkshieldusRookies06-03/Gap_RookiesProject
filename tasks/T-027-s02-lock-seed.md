# T-027 — `fix(security): [S-02] 로그인 5회 잠금 · B-5 [T-027]` + SeedIngestRunner

**담당:** BE-인증 · **브랜치:** `feature/be-auth-T-027` · **예상:** D3 · **선행:** T-015

## [배경]
SPEC.md §7 S-02 · §2 시드 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
`fix(security): [S-02] 로그인 5회 잠금 · B-5 [T-027]` + SeedIngestRunner.

## [수용 기준]
- [ ] `AuthAcceptanceTest` ⑤·(지킴) green
- [ ] 존재하는 계정만 카운트 · `locked_until` · `AuditLog.locked(email)`
- [ ] SeedIngestRunner: 프로파일 seed로 기동하면 전 문서 delete→ingest(실패는 로그만)
- [ ] seed 기동 후 시드 문서로 분석 스트림이 sources를 낸다
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-027` 무출력

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/auth/` · `backend/src/main/java/com/jobgap/user/` · `backend/src/main/java/com/jobgap/seed/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-027]`

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=AuthAcceptanceTest
```
