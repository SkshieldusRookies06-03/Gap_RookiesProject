# T-026 — `fix(security): [S-01] 문서·분석 소유 검증 · B-2 [T-026]`

**담당:** BE-기능 · **브랜치:** `feature/be-feature-T-026` · **예상:** D3 · **선행:** T-014 · T-025 · 기술 리드 재현

## [배경]
SPEC.md §7 S-01 · ADR-06 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
`fix(security): [S-01] 문서·분석 소유 검증 · B-2 [T-026]` — 방어만 담은 커밋 하나.

## [수용 기준]
- [ ] 기술 리드가 조치 전 커밋에서 재현(Burp/curl 캡처)한 **뒤에** 커밋
- [ ] 검증 순서 소유(403) → 존재(404) → 입력(400) · `AuditLog.forbidden(...)`
- [ ] `DocumentAcceptanceTest` ② · `AnalysisAcceptanceTest` ②⑥ green
- [ ] IDOR 403 회귀 테스트 1(내 테스트 폴더)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-026` 무출력

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/document/DocumentService.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisService.java` · `backend/src/test/java/com/jobgap/document/` · `backend/src/test/java/com/jobgap/analysis/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-026]`
- 참고: 커밋 메시지 형식이 점검서·발표·게이트를 묶는다 — 그대로 쓴다.

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,AnalysisAcceptanceTest'
```
