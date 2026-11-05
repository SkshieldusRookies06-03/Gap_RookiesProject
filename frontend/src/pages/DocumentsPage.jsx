// 골격 — 오너: FE-화면 · 티켓 T-021 · SPEC §4.2 · §5
// 판정 테스트: src/pages/DocumentsPage.test.jsx (수정 금지 — 기술 리드 작성)
// 해야 할 것: 타입 탭(전체/공고/이력서) · 정렬(createdAt|title) · 페이지 · 업로드(useUpload) · 제목 수정 · 삭제
//            상태 넷: 로딩 = LoadingSpinner · 빈 = EmptyState("공고나 이력서를 올려 보세요") · 에러 = ErrorMessage · 정상 = 목록
//            제목은 JSX {title} 텍스트로만 렌더(HTML 주입 API 금지 · F-1)
export default function DocumentsPage() {
  return <p>TODO T-021 — DocumentsPage</p>;
}
