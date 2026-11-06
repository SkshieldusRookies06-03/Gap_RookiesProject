# T-056 — 분석 목록(lastStatus 파생)·메시지 페이징

**담당:** BE-기능 · **브랜치:** `feature/backend` · **예상:** D3 · **선행:** T-025

## [배경]
SPEC.md §4.3 목록·메시지 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
분석 목록(lastStatus 파생)·메시지 페이징.

## [수용 기준]
- [ ] `AnalysisAcceptanceTest` ⑥의 목록·페이징 단언(403 단언은 T-026 뒤)
- [ ] `BoundaryAcceptanceTest` `paging`(분석 목록·메시지 줄) green
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-056` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/analysis/AnalysisService.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisDtos.java`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-056]` · 전면 재작성 금지

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest='AnalysisAcceptanceTest,BoundaryAcceptanceTest#paging'
```
