# T-013 — Document·Analysis·AnalysisMessage 엔티티와 리포지토리 3개

**담당:** BE-기능 · **브랜치:** `feature/be-feature-T-013` · **예상:** D2 · **선행:** T-012 · T-015(User)

## [배경]
SPEC.md §2 · onboarding/BF §3 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
Document·Analysis·AnalysisMessage 엔티티와 리포지토리 3개.

## [수용 기준]
- [ ] `@Table`·`@Column(nullable,length)` · snake_case · to-one LAZY · enum `columnDefinition="VARCHAR(20)"` · sources `"TEXT"`
- [ ] 양방향은 `Analysis.messages` 하나(mappedBy · cascade ALL · orphanRemoval)
- [ ] 메서드 이름 쿼리 1 + `@Query` 1 · `validate` 통과
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-013` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/document/Document.java` · `backend/src/main/java/com/jobgap/document/DocumentRepository.java` · `backend/src/main/java/com/jobgap/analysis/Analysis.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisMessage.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisRepository.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisMessageRepository.java`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-013]` · 전면 재작성 금지

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=JobgapApplicationTests
```
