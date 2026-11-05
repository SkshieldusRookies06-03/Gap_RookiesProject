# T-025 — 분석 스트림 중계

**담당:** BE-기능 · **브랜치:** `feature/backend` · **예상:** D3 · **선행:** T-006 · T-013 · T-019

## [배경]
SPEC.md §4.3 중계 규칙 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
분석 스트림 중계 — 새 분석·후속 질문 · done 가로채 저장.

## [수용 기준]
- [ ] `AnalysisAcceptanceTest` ① ③ ④ ⑤ green
- [ ] WebClient responseTimeout 290s · analysis 이벤트 선행 · done 가로채 ASSISTANT 저장 후 done{messageId} · 끊김·error면 미저장
- [ ] 스트림 curl(SPEC §4.3)에서 토큰이 시간 간격을 두고
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-025` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/analysis/AnalysisService.java` · `backend/src/main/java/com/jobgap/analysis/AnalysisController.java` · `backend/src/main/java/com/jobgap/ai/AiClient.java`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-025]` · 전면 재작성 금지
- 참고: 소유 검증은 T-026에서 별도 커밋

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=AnalysisAcceptanceTest
```
