import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server.js';
import { API, fail, ok } from '../test/handlers.js';
import { api, streamPost } from './client.js';
import { createSseParser } from './sse.js';
import { useAuthStore } from '../stores/authStore.js';

// 회귀 테스트 — 기술 리드 · 리뷰에서 찾은 세션·스트림 결함이 되살아나지 않게 (6번 명세 §6·§7 · SPEC §1 인증 행)
// CI 1단계(`npx vitest run src/api`)에 포함된다 — 공용 모듈을 고치면 여기도 green이어야 한다.

const session = (s) => useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, ...s });
const refreshOk = (spy = vi.fn()) => http.post(`${API}/api/auth/refresh`, async ({ request }) => {
  spy(await request.json());
  return HttpResponse.json(ok({ accessToken: 'new', refreshToken: 'r2' }));
});
const refreshFail = () => http.post(`${API}/api/auth/refresh`, () => HttpResponse.json(fail(401, 'INVALID_REFRESH_TOKEN'), { status: 401 }));
const needsNew = (path, data = 'ok') => http.get(`${API}${path}`, ({ request }) => (request.headers.get('Authorization') === 'Bearer new'
  ? HttpResponse.json(ok(data)) : HttpResponse.json(fail(401, 'UNAUTHORIZED'), { status: 401 })));

describe('[기술 리드 T-009] 세션 복구 · 스트림 401 · 중단 구분 (회귀)', () => {
  beforeEach(() => session({}));

  it('새로고침 직후(Access 없음 · Refresh만) — 요청 전에 refresh 1회로 복구하고 세션을 지우지 않는다', async () => {
    session({ refreshToken: 'r1', user: { name: 'k' } });
    const spy = vi.fn();
    server.use(refreshOk(spy), needsNew('/api/documents', 'docs'));
    await expect(api.get('/api/documents')).resolves.toBe('docs');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ refreshToken: 'r1' });
    expect(useAuthStore.getState()).toMatchObject({ accessToken: 'new', refreshToken: 'r2' });
  });

  it('새로고침 직후 동시 요청 둘 — refresh는 한 번만', async () => {
    session({ refreshToken: 'r1' });
    const spy = vi.fn();
    server.use(refreshOk(spy), needsNew('/api/a', 'A'), needsNew('/api/b', 'B'));
    await expect(Promise.all([api.get('/api/a'), api.get('/api/b')])).resolves.toEqual(['A', 'B']);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('새로고침 직후 refresh가 실패하면 세션을 비우고 INVALID_REFRESH_TOKEN', async () => {
    session({ refreshToken: 'stale' });
    server.use(refreshFail());
    const e = await api.get('/api/documents').catch((x) => x);
    expect(e.code).toBe('INVALID_REFRESH_TOKEN');
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it('로그인·가입은 Refresh가 남아 있어도 refresh를 먼저 부르지 않는다', async () => {
    session({ refreshToken: 'r1' });
    const spy = vi.fn();
    server.use(refreshOk(spy), http.post(`${API}/api/auth/login`, () => HttpResponse.json(ok({ accessToken: 'a', refreshToken: 'r', user: { name: 'k' } }))));
    await api.post('/api/auth/login', { email: 'k@e.com', password: 'x' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('streamPost — TOKEN_EXPIRED면 refresh 1회 후 재시도해 스트림 Response를 돌려준다', async () => {
    session({ accessToken: 'old', refreshToken: 'r1' });
    server.use(refreshOk(), http.post(`${API}/api/analyses/stream`, ({ request }) => (request.headers.get('Authorization') === 'Bearer new'
      ? new HttpResponse('event:done\ndata:{}\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
      : HttpResponse.json(fail(401, 'TOKEN_EXPIRED'), { status: 401 }))));
    const res = await streamPost('/api/analyses/stream', { postingId: '12', resumeId: '15' });
    expect(res.headers.get('content-type')).toContain('text/event-stream');
  });

  it('streamPost — refresh 실패면 세션을 비운다', async () => {
    session({ accessToken: 'old', refreshToken: 'r1' });
    server.use(refreshFail(), http.post(`${API}/api/analyses/stream`, () => HttpResponse.json(fail(401, 'TOKEN_EXPIRED'), { status: 401 })));
    const e = await streamPost('/api/analyses/stream', {}).catch((x) => x);
    expect(e.code).toBe('INVALID_REFRESH_TOKEN');
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it('streamPost — TOKEN_EXPIRED가 아닌 401이면 세션을 비운다 · 403은 세션을 지키고 ApiError', async () => {
    session({ accessToken: 'a', refreshToken: 'r1' });
    server.use(http.post(`${API}/api/analyses/stream`, () => HttpResponse.json(fail(403, 'FORBIDDEN'), { status: 403 })));
    expect((await streamPost('/api/analyses/stream', {}).catch((x) => x)).code).toBe('FORBIDDEN');
    expect(useAuthStore.getState().refreshToken).toBe('r1');

    server.use(http.post(`${API}/api/analyses/stream`, () => HttpResponse.json(fail(401, 'UNAUTHORIZED'), { status: 401 })));
    expect((await streamPost('/api/analyses/stream', {}).catch((x) => x)).code).toBe('UNAUTHORIZED');
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it('streamPost — 연결 실패도 code가 있는 ApiError(NETWORK_ERROR)', async () => {
    session({ accessToken: 'a', refreshToken: 'r1' });
    server.use(http.post(`${API}/api/analyses/stream`, () => HttpResponse.error()));
    const e = await streamPost('/api/analyses/stream', {}).catch((x) => x);
    expect(e.code).toBe('NETWORK_ERROR');
  });

  it('사용자가 끊은 요청은 ABORTED — "시간 초과"로 보이지 않는다 · 이미 끊긴 signal도', async () => {
    session({ accessToken: 'a', refreshToken: 'r1' });
    server.use(http.get(`${API}/api/slow`, async () => { await new Promise((r) => setTimeout(r, 300)); return HttpResponse.json(ok(1)); }));
    const ctrl = new AbortController();
    const pending = api.get('/api/slow', { signal: ctrl.signal }).catch((x) => x);
    setTimeout(() => ctrl.abort(), 20);
    const e = await pending;
    expect(e.code).toBe('ABORTED');
    expect(e.message).not.toContain('시간');

    const done = new AbortController(); done.abort();
    expect((await api.get('/api/slow', { signal: done.signal }).catch((x) => x)).code).toBe('ABORTED');
  });

  it('타임아웃은 NETWORK_ERROR "요청 시간이 초과되었습니다"', async () => {
    session({ accessToken: 'a', refreshToken: 'r1' });
    server.use(http.get(`${API}/api/slow`, async () => { await new Promise((r) => setTimeout(r, 300)); return HttpResponse.json(ok(1)); }));
    const e = await api.get('/api/slow', { timeout: 30 }).catch((x) => x);
    expect(e.code).toBe('NETWORK_ERROR');
    expect(e.message).toContain('시간이 초과');
  });
});

describe('[기술 리드 T-009] SSE 파서 — 줄바꿈 경계 (회귀)', () => {
  const collect = (chunks) => {
    const got = [];
    const p = createSseParser((e, d) => got.push([e, d]));
    chunks.forEach((c) => p.feed(c));
    return got;
  };

  it('CRLF가 조각 경계에서 \\r | \\n 으로 갈려도 프레임을 놓치지 않는다', () => {
    expect(collect(['event:token\r', '\ndata:"a"\r', '\n\r', '\nevent:done\r\ndata:{}\r\n\r\n']))
      .toEqual([['token', '"a"'], ['done', '{}']]);
  });

  it('단독 CR 줄바꿈도 허용한다 (SSE 규격)', () => {
    expect(collect(['event:token\rdata:"b"\r\r', 'x'])).toEqual([['token', '"b"']]);
  });

  it('(지킴) LF만 쓰는 기본 형식은 그대로', () => {
    expect(collect(['event: sources\ndata: []\n\n'])).toEqual([['sources', '[]']]);
  });
});
