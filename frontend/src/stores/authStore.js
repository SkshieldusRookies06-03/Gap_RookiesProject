import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 인증 스토어 (오너: 팀장) — SPEC §1 인증 행.
 * Access는 메모리에만, Refresh만 localStorage(partialize). 잔여 위험(XSS 시 탈취)은 점검서 §7.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) =>
        set((s) => ({ accessToken, refreshToken, user: user ?? s.user })),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'jobgap-auth',
      partialize: (s) => ({ refreshToken: s.refreshToken, user: s.user }),
    },
  ),
);
