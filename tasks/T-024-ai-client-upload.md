# T-024 — AiClient(단건)와 업로드·삭제 흐름을 구현한다

**담당:** BE-기능 · **브랜치:** `feature/backend` · **예상:** D3 · **선행:** T-014 · T-018

## [배경]
SPEC.md §1 AI 호출·업로드 순서 · §6.1 · §6.4 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
AiClient(단건)와 업로드·삭제 흐름을 구현한다.

## [수용 기준]
- [ ] `DocumentAcceptanceTest` ④·⑤·⑦ green (③은 한 메서드라 마스킹 연결 T-028 뒤에 green — 그 전에는 ingest 호출·내 uuid 부분까지 확인)
- [ ] RestClient connect 3s · read 30s · `X-Internal-Token` · 실패 → `BusinessException(AI_UNAVAILABLE)`
- [ ] 업로드: 검증(확장자·MIME·UTF-8 디코딩·빈 파일·**`file.getSize()` > 200KB → FILE_TOO_LARGE 직접 검사**) → 저장(트랜잭션 끝) → ingest → 실패 시 행 삭제 + 503
- [ ] 삭제: AI DELETE → 분석들 → 문서 · AI 실패면 503이고 DB 그대로
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-024` 무출력

## [제약]
- 수정 허용: `backend/src/main/java/com/jobgap/ai/` · `backend/src/main/java/com/jobgap/document/DocumentService.java` · `backend/src/main/java/com/jobgap/document/Document.java`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-024]`

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest=DocumentAcceptanceTest
```
