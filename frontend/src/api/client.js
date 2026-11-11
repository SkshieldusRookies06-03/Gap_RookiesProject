import { useAuthStore } from '../stores/authStore.js';

/**
 * 모든 HTTP 호출은 여기를 지난다 (오너: FE-화면 · CLAUDE.md 규약 2). SPEC §1 응답 봉투 · §4.4 에러.
 * - 성공 봉투를 벗겨 data만 돌려준다 · success:false면 ApiError(code·message·status·fields)로 reject
 * - TOKEN_EXPIRED(401)만 refresh 1회 후 재시도. 동시 401은 refresh 한 번:
 *   탭 안 = 진행 중 Promise 공유 · 탭 사이 = navigator.locks 안에서 localStorage를 다시 읽고 이미 바뀌었으면 그 값을 쓴다
 * - fetch 기본 타임아웃이 없으므로 10초(스트림 제외)
 */
export const BASE = import.meta.env.VITE_API_URL ?? '';
const TIMEOUT_MS = 10000;
const SLOW_TIMEOUT_MS = 35000;   // 업로드·삭제는 AI 적재·삭제를 기다린다(AI read 30s) — 10초면 서버는 커밋했는데 화면은 실패로 보인다

export class ApiError extends Error {
  constructor({ status, code, message, fields }) {
    super(message || '요청에 실패했습니다');
    this.status = status;
    this.code = code || 'UNKNOWN';
    this.fields = fields || [];
  }
}

async function parse(res) {
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!body || typeof body.success !== 'boolean') {
    // nginx HTML 413·502 등 봉투가 아닌 응답
    throw new ApiError({ status: res.status, code: res.status === 413 ? 'FILE_TOO_LARGE' : 'NETWORK_ERROR', message: '서버 응답을 해석할 수 없습니다' });
  }
  if (!body.success) throw new ApiError({ status: res.status, ...body });
  return body.data;
}

let refreshing = null;

async function doRefresh() {
  const run = async () => {
    // 잠금 안에서 localStorage를 다시 읽는다 — 다른 탭이 방금 회전했으면 그 새 refresh로 요청한다(회전된 옛 값 재사용 방지)
    await useAuthStore.persist?.rehydrate?.();
    const current = useAuthStore.getState().refreshToken;
    if (!current) throw new ApiError({ status: 401, code: 'INVALID_REFRESH_TOKEN', message: '다시 로그인하세요' });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);   // 10초가 지나면 기다리지 않고 끊는다
    let res;
    try {
      res = await fetch(`${BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current }),
        signal: ctrl.signal,
      });
    } catch (e) {
      throw networkError(e, undefined, true);   // 연결 실패·시간 초과 → NETWORK_ERROR (로그아웃 안 됨)
    } finally {
      clearTimeout(timer);
    }

    const data = await parse(res);
    useAuthStore.getState().setSession(data);
  };
  if (!refreshing) {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    refreshing = (locks ? locks.request('jobgap-refresh', run) : run()).finally(() => { refreshing = null; });
  }
  return refreshing;
}

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

/** refresh 실패면 세션을 비우고 그 에러를 던진다 (6번 명세 §7 — refresh 실패 = 로그인으로) */
async function refreshOrClear() {
  try {
    await doRefresh();
  } catch (e) {
    if (e?.status === 401) useAuthStore.getState().clear();
    throw e;
  }
}


/**
 * 새로고침 직후엔 Access(메모리)가 없고 Refresh(localStorage)만 있다 — 토큰 없이 보내면 401 UNAUTHORIZED로 세션이 지워지므로
 * 먼저 refresh 1회로 Access를 복구한다 (6번 명세 §6 "새로고침 후에도 로그인 유지").
 */
async function ensureAccess(path) {
  if (PUBLIC_PATHS.includes(path)) return;
  const { accessToken, refreshToken } = useAuthStore.getState();
  if (!accessToken && refreshToken) await refreshOrClear();
}

/** fetch 예외 → ApiError. 사용자가 끊은 중단(ABORTED)과 타임아웃·연결 실패(NETWORK_ERROR)를 가른다 */
function networkError(e, userSignal, timedOut) {
  if (userSignal?.aborted && !timedOut) return new ApiError({ status: 0, code: 'ABORTED', message: '요청을 취소했습니다' });
  if (e?.name === 'AbortError') return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: '요청 시간이 초과되었습니다' });
  return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: '서버에 연결할 수 없습니다' });
}

async function send(method, path, { body, form, signal, retried = false, timeout = TIMEOUT_MS } = {}) {
  if (!retried) await ensureAccess(path);
  const headers = {};
  const token = useAuthStore.getState().accessToken;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeout);
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined), signal: ctrl.signal });
  } catch (e) {
    throw networkError(e, signal, timedOut);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
  try {
    return await parse(res);
  } catch (e) {
    if (e.code === 'TOKEN_EXPIRED' && !retried && !PUBLIC_PATHS.includes(path)) {
      await refreshOrClear();
      return send(method, path, { body, form, signal, retried: true, timeout });
    }
    if (e.status === 401 && path !== '/api/auth/login') useAuthStore.getState().clear();
    throw e;
  }
}

export const api = {
  get: (path, opts) => send('GET', path, opts),
  post: (path, body, opts) => send('POST', path, { ...opts, body }),
  put: (path, body, opts) => send('PUT', path, { ...opts, body }),
  del: (path, opts) => send('DELETE', path, { timeout: SLOW_TIMEOUT_MS, ...opts }),
  upload: (path, formData, opts) => send('POST', path, { timeout: SLOW_TIMEOUT_MS, ...opts, form: formData }),
};

/**
 * 스트림 시작 (SPEC §5) — 봉투를 벗기지 않고 Response를 그대로 돌려준다(본문은 useChatStream이 getReader로 읽는다).
 * 시작 전 검증 실패(403/404/400)는 JSON 봉투라 여기서 ApiError로 바꾼다. TOKEN_EXPIRED면 refresh 1회 후 재시도.
 */
export async function streamPost(path, body, signal, retried = false) {
  if (!retried) await ensureAccess(path);
  const token = useAuthStore.getState().accessToken;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    throw networkError(e, signal, false);
  }
  if ((res.headers.get('content-type') || '').includes('text/event-stream')) return res;
  try {
    await parse(res);
    throw new ApiError({ status: res.status, code: 'NOT_A_STREAM', message: '스트림 응답이 아닙니다' });
  } catch (e) {
    if (e.code === 'TOKEN_EXPIRED' && !retried) {
      await refreshOrClear();
      return streamPost(path, body, signal, true);
    }
    if (e.status === 401) useAuthStore.getState().clear();   // send()와 같은 규칙 (6번 명세 §7)
    throw e;
  }
}
