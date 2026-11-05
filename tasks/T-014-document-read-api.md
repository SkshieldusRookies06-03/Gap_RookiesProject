# T-014 — 문서 목록·상세·제목 수정·삭제(단순 삭제)

**담당:** BE-기능 · **브랜치:** `feature/be-feature-T-014` · **예상:** D2 · **선행:** T-013

## [배경]
SPEC.md §4.2 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
문서 목록·상세·제목 수정·삭제(단순 삭제) — **소유 검증 없이**(S-01 조치 전 상태).

## [수용 기준]
- [ ] `DocumentAcceptanceTest` ① ⑥ green
- [ ] 정렬 `PageRequests.documentSort()` · 페이지 `PageRequests.of()` · 서비스에만 `@Transactional`(조회 readOnly)
- [ ] check-api 문서 행 green(403 행 제외)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-014` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/document/DocumentService.java` · `backend/src/main/java/com/jobgap/document/DocumentController.java` · `backend/src/main/java/com/jobgap/document/DocumentDtos.java` · `backend/src/test/java/com/jobgap/document/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-014]` · 전면 재작성 금지
- 참고: 삭제 순서(AI DELETE)는 T-055

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=DocumentAcceptanceTest
```
