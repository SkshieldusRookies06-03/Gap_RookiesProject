# T-010 — 분석 화면 골격·useChatStream·chatStore 팩을 커밋하고, 목 스트림을 콘솔에 찍어 본다

**담당:** FE-분석 · **브랜치:** `feature/frontend` · **예상:** D1 · **선행:** T-009

## [배경]
SPEC.md §4.3 · §5 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
분석 화면 골격·useChatStream·chatStore 팩을 커밋하고, 목 스트림을 콘솔에 찍어 본다.

## [수용 기준]
- [ ] 골격 팩 커밋
- [ ] 와이어(종이 1장) 사진을 PR에 첨부 — SPEC §4.3 필드와 대조한 결과 한 줄
- [ ] `node mock/server.mjs` 띄우고 브라우저 콘솔에서 토큰이 시간 간격을 두고 찍힌다(임시 코드는 커밋하지 않는다)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-010` 무출력

## [제약]
- 수정 허용: `frontend/src/pages/analysis/` · `frontend/src/hooks/useChatStream.js` · `frontend/src/stores/chatStore.js`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-010]`

## [확인 명령]
```bash
cd frontend && npm run build
```
