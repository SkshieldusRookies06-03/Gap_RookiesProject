# T-026 — `fix(security): [S-01] 문서·분석 소유 검증 · B-2 [T-026]`

**담당:** BE-기능 · **브랜치:** `feature/be-feature-T-026` · **예상:** D3 · **선행:** T-014 · T-025 · T-062(FE-분석 재현)

## [배경]
SPEC.md §7 S-01 · ADR-06 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
`fix(security): [S-01] 문서·분석 소유 검증 · B-2 [T-026]` — 방어만 담은 커밋 하나.

## [수용 기준]
- [ ] FE-분석의 조치 전 재현(T-062) 캡처 **뒤에** 머지
- [ ] 소유(403) → 존재(404) → 업무 규칙(400) · `AuditLog.forbidden(...)`
- [ ] `DocumentAcceptanceTest` ② · `AnalysisAcceptanceTest` ② ⑥ green · IDOR 회귀 테스트 1
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-026` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/document/DocumentService.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisService.java` · `backend/src/test/java/com/jobgap/document/` · `backend/src/test/java/com/jobgap/analysis/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-026]` · 전면 재작성 금지

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,AnalysisAcceptanceTest'
```
