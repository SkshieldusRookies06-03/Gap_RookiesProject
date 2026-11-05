# T-028 — `fix(security): [S-03] 업로드·제목·질문 PiiMasker 연결 · A-3 [T-028]` + 감사 로그 캡처

**담당:** 기술 리드·보안 · **브랜치:** `feature/security` · **예상:** D3 · **선행:** T-017 · T-024

## [배경]
SPEC.md §7 S-03 · ADR-04 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
`fix(security): [S-03] 업로드·제목·질문 PiiMasker 연결 · A-3 [T-028]` + 감사 로그 캡처.

## [수용 기준]
- [ ] 조치 전 재현 캡처 `security/evidence/S-03/before.json`
- [ ] `DocumentAcceptanceTest` ③ green
- [ ] 감사 로그 4줄 `security/evidence/B-9-audit.txt`
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-028` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/security/` · `security/evidence/S-03/` · `security/evidence/B-9-audit.txt` · `backend/src/main/java/com/jobgap/document/DocumentService.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisService.java`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-028]` · 전면 재작성 금지
- 참고: BF 파일은 호출 1줄씩만 — BF 리뷰

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=DocumentAcceptanceTest
```
