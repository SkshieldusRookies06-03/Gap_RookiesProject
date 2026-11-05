# 역할 시트 — FE-분석

> 정본은 `SPEC.md`. 이 시트는 요약이다 — 다르면 SPEC이 이긴다. 티켓 지시서는 `tasks/T-###-*.md`.

## 0. 내 판정 테스트 (지금 red인 것이 내 일이다)
`src/hooks/useChatStream.test.jsx` 4 (red → T-022)

## 1. 한 줄
분석 화면 — 공고·이력서 선택, 리포트 스트리밍, 중단, 출처, 후속 질문, 반응형 증거.

## 2. 내 파일 / 안 건드리는 파일
- 소유: `frontend/src/pages/analysis/` · `src/hooks/useChatStream.js` · `src/stores/chatStore.js` · `docs/6-*`
- 안 건드림: `src/api/`·`components/`·`routes.js`·`App.jsx`(팀장) · 판정 테스트
- 공용 파일을 고쳐야 하면 그 오너에게 티켓으로 넘긴다 (`node seams/check-scope.mjs <티켓>`이 잡는다)

## 3. 내 계약 상대
소비: `POST /api/analyses/stream`·messages(SPEC §4.3) + 팀장의 `streamPost`·`createSseParser`·`decodeData`

## 4. 내 티켓 순서
T-010 → T-022 → T-030 → T-039 → T-043(반응형 캡처 · 6번 문서)

## 5. 내가 쓰는 문서 (내 절 = 내 커밋)
6번 Frontend 개발명세서(Hook 표 · 화면 상태 표 · 반응형 절)

## 6. 내 명령어
```bash
node mock/server.mjs   # 스트림까지 흉내낸다
cd frontend && npx vitest run src/hooks
npm run dev
```

## 7. 막힐 곳
- `EventSource`는 POST·헤더 불가 → fetch + getReader
- 첫 글자가 사라짐 → `data:` 뒤 공백 0~1 허용(sse.js가 처리) · 직접 slice(6) 금지
- 토큰에 따옴표가 보임 → decodeData로 JSON 디코드
- 중단 후 다음 질문이 안 됨 → AbortError는 에러로 취급하지 않고 streaming만 false

## 8. 발표에서 내가 말하는 한 문장
"답변이 생성되는 대로 흘러나오고, 출처가 문서인지 웹인지 칩으로 구분된다."

## 9. 매일
아침: 그날 티켓 확인 · 저녁: 내 PR 머지 + `node scripts/check-sec-deploy.mjs` 무출력 + 1커밋 이상(개인 평가) · 막히면 30분 안에 채널에.
