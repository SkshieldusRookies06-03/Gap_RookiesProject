# T-025 — 분석 스트림 중계·목록·메시지 페이징을 구현한다

**담당:** BE-기능 · **브랜치:** `feature/be-feature-T-025` · **예상:** D3 · **선행:** T-006 · T-013 · T-019

## [배경]
SPEC.md §4.3 중계 규칙 · §6.2 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
분석 스트림 중계·목록·메시지 페이징을 구현한다 — **소유 검증은 T-026에서 별도 커밋**.

## [수용 기준]
- [ ] `AnalysisAcceptanceTest` ①③④⑤ green
- [ ] WebClient `bodyToFlux(ServerSentEvent)` · responseTimeout 300s · `onErrorResume` → error 봉투
- [ ] 새 분석이면 `analysis` 이벤트 먼저 · AI의 done은 가로채 ASSISTANT 저장 후 `done{messageId}` · 끊김·error면 저장 안 함
- [ ] 질문 저장(짧은 트랜잭션) → 스트림(밖) → 답변 저장(새 트랜잭션) · history = 이전 메시지 최근 6개
- [ ] 스킬 P3-3 curl 스트림 검사: 토큰이 시간 간격을 두고
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-025` 무출력

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/analysis/` · `backend/src/main/java/com/jobgap/ai/AiClient.java`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-025]`

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=AnalysisAcceptanceTest
```
