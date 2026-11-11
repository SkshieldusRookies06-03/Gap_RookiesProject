import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server.js';
import { API, fail } from '../test/handlers.js';
import { api } from './client.js';
import { useAuthStore } from '../stores/authStore.js';

// FE-화면 · SPEC §4.1 refresh 실패 처리 — 401이면 세션 삭제, 서버 장애면 세션 유지
describe('[FE-화면] refresh 서버 장애 시 세션 유지 (SPEC §4.1)', () => {
  it('refresh가 500이면 refreshToken을 지우지 않는다', async () => {
    useAuthStore.setState({ accessToken: null, refreshToken: 'r1', user: { name: 'k' } });
    server.use(http.post(`${API}/api/auth/refresh`, () => HttpResponse.json(fail(500, 'INTERNAL_SERVER_ERROR'), { status: 500 })));
    await expect(api.get('/api/documents')).rejects.toBeTruthy();
    expect(useAuthStore.getState().refreshToken).toBe('r1');
  });

  it('refresh 서버에 연결할 수 없으면(네트워크 오류) refreshToken을 지우지 않는다', async () => {
    useAuthStore.setState({ accessToken: null, refreshToken: 'r1', user: { name: 'k' } });
    server.use(http.post(`${API}/api/auth/refresh`, () => HttpResponse.error()));
    const e = await api.get('/api/documents').catch((err) => err);
    expect(e.code).toBe('NETWORK_ERROR');
    expect(useAuthStore.getState().refreshToken).toBe('r1');
  });
});
