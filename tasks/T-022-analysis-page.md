# T-022 — useChatStream과 분석 화면(선택 → 스트리밍 → 중단)을 완성한다

**담당:** FE-분석 · **브랜치:** `feature/fe-analysis-T-022` · **예상:** D2 · **선행:** T-010

## [배경]
SPEC.md §4.3 · §5 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
useChatStream과 분석 화면(선택 → 스트리밍 → 중단)을 완성한다.

## [수용 기준]
- [ ] `src/hooks/useChatStream.test.jsx` 4개 green
- [ ] 재료: `streamPost` · `createSseParser` · `decodeData` · `getReader()`
- [ ] 생성 중 LoadingSpinner + 중단 버튼(AbortController) · 응답 텍스트 렌더(`white-space: pre-wrap`)
- [ ] `@media` 768·1280
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-022` 무출력

## [제약]
- 수정 허용: `frontend/src/hooks/useChatStream.js` · `frontend/src/stores/chatStore.js` · `frontend/src/pages/analysis/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-022]`
- 참고: api/ 는 FE-화면 파일 — 바꿀 게 있으면 FE-화면에게.

## [확인 명령]
```bash
cd frontend && npx vitest run src/hooks
```
