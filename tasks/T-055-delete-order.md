# T-055 — 문서 삭제 순서: AI DELETE → 그 문서를 쓴 분석 → 문서 · AI 실패면 503이고 DB 그대로

**담당:** BE-기능 · **브랜치:** `feature/backend` · **예상:** D3 · **선행:** T-024

## [배경]
SPEC.md §6.4 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
문서 삭제 순서: AI DELETE → 그 문서를 쓴 분석 → 문서 · AI 실패면 503이고 DB 그대로.

## [수용 기준]
- [ ] `DocumentAcceptanceTest` ⑦ green
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-055` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/document/DocumentService.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisRepository.java`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-055]` · 전면 재작성 금지

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=DocumentAcceptanceTest
```
