# T-024 — AiClient 단건(ingest·delete)과 업로드 흐름

**담당:** BE-기능 · **브랜치:** `feature/backend` · **예상:** D3 · **선행:** T-014 · T-018

## [배경]
SPEC.md §1 업로드 순서 · §6.1 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
AiClient 단건(ingest·delete)과 업로드 흐름.

## [수용 기준]
- [ ] `DocumentAcceptanceTest` ④ ⑤ green(③은 T-028 뒤)
- [ ] RestClient connect 3s·read 30s · `X-Internal-Token` · 실패 → AI_UNAVAILABLE
- [ ] 검증(확장자·MIME·UTF-8·빈 파일·크기 직접 검사) → 저장 → 커밋 → ingest → 실패 시 행 삭제
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-024` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/ai/` · `backend/src/main/java/com/jobgap/document/DocumentService.java`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-024]` · 전면 재작성 금지

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=DocumentAcceptanceTest
```
