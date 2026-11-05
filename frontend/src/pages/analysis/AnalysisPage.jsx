// 골격 — 오너: FE-분석 · 티켓 T-022·T-030 · SPEC §4.3 · §5
// 해야 할 것: 공고·이력서 드롭다운(GET /api/documents?type=…) → "분석 시작" → useChatStream.start({postingId, resumeId})
//            → 토큰이 흘러나옴 + LoadingSpinner("생성 중…") + 중단 버튼(stop) → 출처 칩(doc/web 구분) → 하단 입력창으로 후속 질문
//            /analyses/:id 로 들어오면 GET /api/analyses/:id/messages 로 지난 대화를 먼저 그린다
//            응답은 텍스트로 렌더(white-space: pre-wrap) · @media 768/1280 · 캡처 3장(390·768·1280)
export default function AnalysisPage() {
  return <p>TODO T-022 — AnalysisPage</p>;
}
