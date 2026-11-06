# T-007 — 스파이크①: OpenAI 응답 1 + 임베딩 1 · mock_app 실행 확인 · 의존성 고정

**담당:** AI · **브랜치:** `feature/ai` · **예상:** D1 · **선행:** —

## [배경]
SPEC.md §1 LLM·임베딩 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
스파이크①: OpenAI 응답 1 + 임베딩 1 · mock_app 실행 확인 · 의존성 고정.

## [수용 기준]
- [ ] `docs/spikes/llm.md` 결과 · 임베딩 차원 실측값
- [ ] `MOCK=1 AI_INTERNAL_TOKEN=dev-token node seams/check-ai.mjs` green
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-007` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `docs/spikes/` · `ai-module/pyproject.toml` · `ai-module/uv.lock` · `ai-module/.python-version`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-007]` · 전면 재작성 금지

## [확인 명령]
```bash
cd ai-module && uv sync && uv run pytest -q -k 'health or require_token'
```
