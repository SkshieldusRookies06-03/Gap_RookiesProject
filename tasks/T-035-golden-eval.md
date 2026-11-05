# T-035 — 골든셋 세 조건 평가 → `eval/result.md`

**담당:** AI · **브랜치:** `feature/ai` · **예상:** D4 · **선행:** T-029 · T-011

## [배경]
SPEC.md §6.2 평가 · R-AI03 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
골든셋 세 조건 평가 → `eval/result.md`.

## [수용 기준]
- [ ] LLM 단독 · +RAG · +RAG+Tavily × 정답 수·근거 표시율
- [ ] 기준값을 바꿨으면 SPEC §1 PR
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-035` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `ai-module/eval/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-035]` · 전면 재작성 금지
- 참고: 발표 수치는 이 표의 숫자만

## [확인 명령]
```bash
cd ai-module && LLM_PROVIDER=openai python eval/run_eval.py
```
