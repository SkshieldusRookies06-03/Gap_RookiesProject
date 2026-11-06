# T-036 — 프롬프트 인젝션 재현 → 자료 구분자 조치(발견이면 `fix(security): [S-04]`)

**담당:** AI · **브랜치:** `feature/ai` · **예상:** D4 · **선행:** T-029

## [배경]
SPEC.md §7 예비 A-2 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
프롬프트 인젝션 재현 → 자료 구분자 조치(발견이면 `fix(security): [S-04]`).

## [수용 기준]
- [ ] `tests/test_rag_contract.py` `test_prompt_isolates_material_and_escapes_delimiters` green 유지(구분자 탈출 회귀)
- [ ] `security/evidence/A-2/` 전·후 응답 · 원장 A-2 행 내용을 기술 리드에게
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-036` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `ai-module/app/graph.py` · `security/evidence/A-2/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-036]` · 전면 재작성 금지

## [확인 명령]
```bash
cd ai-module && uv run pytest -q
```
