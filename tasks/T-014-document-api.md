# T-014 — 문서 목록·상세·제목 수정·삭제를 구현한다

**담당:** BE-기능 · **브랜치:** `feature/backend` · **예상:** D2 · **선행:** T-013 · T-015(User)

## [배경]
SPEC.md §4.2 · ADR-06 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
문서 목록·상세·제목 수정·삭제를 구현한다 — **소유자 검증 없이 먼저**(S-01 조치 전 상태가 이력에 남아야 한다).

## [수용 기준]
- [ ] `DocumentAcceptanceTest` ①·⑥ green (② 403 행은 T-026에서)
- [ ] 정렬은 `PageRequests.documentSort()` · 페이지는 `PageRequests.of()`
- [ ] `@Transactional`은 서비스에만 · 조회는 `readOnly = true`
- [ ] `node seams/check-api.mjs http://localhost:8080` 문서 행 green(403 제외)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-014` 무출력

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/document/DocumentService.java` · `backend/src/main/java/com/jobgap/document/DocumentController.java` · `backend/src/main/java/com/jobgap/document/DocumentDtos.java` · `backend/src/test/java/com/jobgap/document/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-014]`
- 참고: Controller·DTO는 계약 — 시그니처를 바꾸려면 SPEC PR 먼저.

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=DocumentAcceptanceTest
```
