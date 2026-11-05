# T-030 — 후속 질문·출처 칩·기록 재진입을 붙인다

**담당:** FE-분석 · **브랜치:** `feature/frontend` · **예상:** D3 · **선행:** T-022

## [배경]
SPEC.md §5 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
후속 질문·출처 칩·기록 재진입을 붙인다.

## [수용 기준]
- [ ] /analyses/:id 진입 시 messages 페이지를 먼저 그림 · 후속 질문 입력창
- [ ] 출처 칩 doc/web 구분(웹은 새 탭 링크 `rel=noopener noreferrer`)
- [ ] useChatStream 판정 테스트 그대로 green
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-030` 무출력

## [제약]
- 수정 허용: `frontend/src/pages/analysis/` · `frontend/src/hooks/useChatStream.js` · `frontend/src/stores/chatStore.js`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-030]`

## [확인 명령]
```bash
cd frontend && npm test
```
