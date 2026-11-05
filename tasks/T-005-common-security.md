# T-005 — 공통 봉투·에러·보안 패키지와 판정 테스트를 커밋한다(전부 기술 리드 레인 · 완성본)

**담당:** 기술 리드·보안 · **브랜치:** `feature/techlead-T-005` · **예상:** D1 · **선행:** T-004

## [배경]
SPEC.md §1 응답 봉투 · §4.4 · ADR-04 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
공통 봉투·에러·보안 패키지와 판정 테스트를 커밋한다(전부 기술 리드 레인 · 완성본).

## [수용 기준]
- [ ] `common/`·`security/` 커밋 · 판정 테스트 `src/test/**` 커밋(red 시작 — 2단계 현황판)
- [ ] `./mvnw test -Dtest='JobgapApplicationTests,PiiMaskerTest'` green
- [ ] `node seams/check-scope.mjs --owners` 무출력
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-005` 무출력

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/common/` · `backend/src/main/java/com/jobgap/security/` · `backend/src/test/` · `backend/src/test/resources/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-005]`

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest='JobgapApplicationTests,PiiMaskerTest'
```
