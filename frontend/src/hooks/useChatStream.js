// 골격 — 오너: FE-분석 · 티켓 T-010(뼈대) · T-022 · T-030
// 판정 테스트: src/hooks/useChatStream.test.jsx (수정 금지 — 기술 리드 작성)
//
// 계약(테스트가 보는 반환값):
//   const { messages, streaming, error, analysisId, start, stop } = useChatStream(initialAnalysisId?)
//   start({ postingId, resumeId })          새 분석 — 질문 없이
//   start({ analysisId, question })         후속 질문
//   messages: [{ role: 'USER'|'ASSISTANT', content: string, sources: [] }]  (ASSISTANT content는 토큰 누적)
//   streaming: boolean · error: ApiError | {code, message} | null · stop(): 중단(AbortController) → 부분 답변은 화면에 남기되 streaming=false
// 구현 재료: streamPost(api/client.js) · createSseParser·decodeData(api/sse.js) · res.body.getReader() + TextDecoder
// 이벤트: analysis → analysisId 설정 · token → 디코드해서 마지막 ASSISTANT에 덧붙임 · sources → 마지막 ASSISTANT.sources · done → streaming=false · error → error 설정
export function useChatStream() {
  throw new Error('T-022 미구현 — useChatStream');
}
