import { create } from 'zustand';

/**
 * 분석 화면 스토어 (오너: FE-분석 · T-022) — 서버 데이터의 사본이 아니라 "지금 보고 있는 분석"의 화면 상태.
 * 모양은 자유지만 useChatStream 판정 테스트가 이 이름들을 쓰지는 않는다(훅의 반환값만 본다).
 */
export const useChatStore = create((set) => ({
  analysisId: null,
  messages: [],          // [{ role: 'USER'|'ASSISTANT', content, sources: [] }]
  setAnalysisId: (analysisId) => set({ analysisId }),
  setMessages: (messages) => set({ messages }),
  reset: () => set({ analysisId: null, messages: [] }),
}));
