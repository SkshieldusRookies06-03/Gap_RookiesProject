# T-013 — Document·Analysis·AnalysisMessage 엔티티와 리포지토리를 만든다

**담당:** BE-기능 · **브랜치:** `feature/backend` · **예상:** D2 · **선행:** T-012

## [배경]
SPEC.md §2 · 스킬 P3-0.1 엔티티 규약 행 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
Document·Analysis·AnalysisMessage 엔티티와 리포지토리를 만든다.

## [수용 기준]
- [ ] `@Table(name)`·`@Column(nullable, length)` 전부 · snake_case · to-one 전부 `fetch = LAZY`
- [ ] 양방향은 `Analysis.messages` 하나(`mappedBy` + `cascade = ALL, orphanRemoval = true`)
- [ ] 날짜 `OffsetDateTime` · id는 Long(응답 DTO에서 문자열)
- [ ] 리포지토리: 메서드 이름 쿼리 1 + `@Query`(`:param` 바인딩) 1
- [ ] `./mvnw test -Dtest=JobgapApplicationTests` green (validate 통과)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-013` 무출력

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/document/Document.java` · `backend/src/main/java/com/jobgap/document/DocumentRepository.java` · `backend/src/main/java/com/jobgap/analysis/Analysis.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisMessage.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisRepository.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisMessageRepository.java`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-013]`
- 참고: User 엔티티는 BE-인증(T-015) — 연관관계는 `@ManyToOne(fetch = LAZY) User owner`로 참조한다.

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=JobgapApplicationTests
```
