# T-028 — `fix(security): [S-03] 업로드·제목·질문 PiiMasker 연결 · A-3 [T-028]`

**담당:** 기술 리드·보안 · **브랜치:** `feature/techlead-T-028` · **예상:** D3 · **선행:** T-017 · T-024

## [배경]
SPEC.md §7 S-03 · ADR-04 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
`fix(security): [S-03] 업로드·제목·질문 PiiMasker 연결 · A-3 [T-028]`.

## [수용 기준]
- [ ] 재현(조치 전): dev compose에서 ingest 요청 본문에 원문 연락처 — 캡처를 security/evidence/S-03/
- [ ] `DocumentAcceptanceTest` ③ 마스킹 단언 green
- [ ] 감사 로그 4줄 캡처(성공·실패·401·403 · 이메일 마스킹)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-028` 무출력

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/security/` · `security/` · `backend/src/main/java/com/jobgap/document/DocumentService.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisService.java`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-028]`
- 참고: BF 파일은 호출 1줄씩만 — BF가 리뷰한다.

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=DocumentAcceptanceTest
```
