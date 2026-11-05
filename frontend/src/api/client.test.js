import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server.js';
import { API, fail, ok } from '../test/handlers.js';
import { api, ApiError } from './client.js';
import { useAuthStore } from '../stores/authStore.js';

describe('[기술 리드 · 팀장 T-009] api/client — 봉투·에러·refresh (SPEC §1 · §4.4)', () => {
  it('성공 봉투를 벗겨 data만 돌려준다', async () => {
    server.use(http.get(`${API}/api/x`, () => HttpResponse.json(ok({ a: 1 }))));
    await expect(api.get('/api/x')).resolves.toEqual({ a: 1 });
  });

  it('success:false는 ApiError(code·status)로 reject', async () => {
    server.use(http.get(`${API}/api/x`, () => HttpResponse.json(fail(403, 'FORBIDDEN'), { status: 403 })));
    const e = await api.get('/api/x').catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.code).toBe('FORBIDDEN');
    expect(e.status).toBe(403);
  });

  it('봉투가 아닌 응답(nginx HTML 413)도 ApiError로', async () => {
    server.use(http.post(`${API}/api/documents`, () => new HttpResponse('<html>413</html>', { status: 413 })));
    const e = await api.upload('/api/documents', new FormData()).catch((x) => x);
    expect(e.code).toBe('FILE_TOO_LARGE');
  });

  it('TOKEN_EXPIRED면 refresh 1회 후 재시도 — 동시 요청 둘이어도 refresh는 한 번', async () => {
    useAuthStore.getState().setSession({ accessToken: 'old', refreshToken: 'r1', user: { name: 'k' } });
    const refresh = vi.fn();
    server.use(
      http.get(`${API}/api/a`, ({ request }) => (request.headers.get('Authorization') === 'Bearer new'
        ? HttpResponse.json(ok('A')) : HttpResponse.json(fail(401, 'TOKEN_EXPIRED'), { status: 401 }))),
      http.get(`${API}/api/b`, ({ request }) => (request.headers.get('Authorization') === 'Bearer new'
        ? HttpResponse.json(ok('B')) : HttpResponse.json(fail(401, 'TOKEN_EXPIRED'), { status: 401 }))),
      http.post(`${API}/api/auth/refresh`, async ({ request }) => {
        refresh(await request.json());
        await new Promise((r) => setTimeout(r, 30));
        return HttpResponse.json(ok({ accessToken: 'new', refreshToken: 'r2' }));
      }),
    );
    await expect(Promise.all([api.get('/api/a'), api.get('/api/b')])).resolves.toEqual(['A', 'B']);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith({ refreshToken: 'r1' });
    expect(useAuthStore.getState().refreshToken).toBe('r2');
  });

  it('(지킴) Refresh만 localStorage에 남고 Access는 남지 않는다 (점검서 F-2)', () => {
    useAuthStore.getState().setSession({ accessToken: 'secret-access', refreshToken: 'r9', user: { name: 'k' } });
    const saved = localStorage.getItem('jobgap-auth');
    expect(saved).toContain('r9');
    expect(saved).not.toContain('secret-access');
  });
});
