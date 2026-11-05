# T-016 — SecurityConfig·필터·핸들러를 실서버에서 관측하고 `SecurityAcceptanceTest`를 green으로 둔다

**담당:** 기술 리드·보안 · **브랜치:** `feature/security` · **예상:** D2 · **선행:** T-005

## [배경]
SPEC.md §1 인증·헬스·SSE 행 · 스킬 P3-0.1 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
SecurityConfig·필터·핸들러를 실서버에서 관측하고 `SecurityAcceptanceTest`를 green으로 둔다.

## [수용 기준]
- [ ] `SecurityAcceptanceTest` green
- [ ] JWT alg 관측(HS256) 결과를 SPEC §1 표 옆에
- [ ] CSRF 사유 문장을 5번 명세 5.2에(내 절 · 내 커밋)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-016` 무출력

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/security/` · `backend/src/main/java/com/jobgap/common/` · `docs/5-`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-016]`

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=SecurityAcceptanceTest
```
