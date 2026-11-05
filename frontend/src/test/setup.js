// 프론트 테스트 공용 설정 (오너: 기술 리드) — 네트워크만 MSW가 가로챈다. api/client.js는 실제로 지난다(봉투 처리 포함).
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './server.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); cleanup(); localStorage.clear(); });
afterAll(() => server.close());
