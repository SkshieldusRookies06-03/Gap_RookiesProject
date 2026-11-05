import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 포트 5173 고정(strictPort) — 점유돼 있으면 5174로 조용히 옮겨 CORS가 깨지는 것을 막는다 (SPEC §1)
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    env: { VITE_API_URL: 'http://localhost' },   // 테스트에서 fetch는 절대 주소가 필요하다(MSW가 이 주소를 가로챈다)
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
