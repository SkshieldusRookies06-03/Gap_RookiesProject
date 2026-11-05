// 골격 — 오너: FE-화면 · 티켓 T-021 (R-FE02 두 번째 커스텀 훅)
// 계약: const { upload, uploading, error } = useUpload();  await upload({ file, type, title }) → DocumentSummary
// 재료: api.upload('/api/documents', formData) · 클라이언트 검증(확장자 .md/.txt · 200KB — 서버 검증이 정본, F-6)
export function useUpload() {
  throw new Error('T-021 미구현 — useUpload');
}
