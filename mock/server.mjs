// mock/server.mjs — SPEC.md §4 계약대로 응답하는 백엔드 목 (의존성 0 · Node 18+)
// 실행: node mock/server.mjs [port=8080]   ·   프론트 VITE_API_URL=http://localhost:8080 그대로 쓴다
// 로그인: kim@example.com / Passw0rd!  (존재하는 계정만 5회 실패 → 423 · 목은 60초 뒤 풀림)
// 남의 리소스: 문서 id "99" · 분석 id "99" → 403   ·   만료 토큰 흉내: Authorization: Bearer mock-expired → 401 TOKEN_EXPIRED
// 계약이 바뀌면 이 파일도 같은 PR에서 고친다 (SPEC §9).
import http from 'node:http';

const PORT = Number(process.argv[2] ?? 8080);
const now = () => new Date(Date.now() + 9 * 3600e3).toISOString().replace('Z', '+09:00').replace(/\.\d+/, '');
const ok = (data, message = '요청이 완료되었습니다') => ({ success: true, data, message, timestamp: now() });
const err = (statusCode, code, message, fields) => ({ success: false, data: null, statusCode, code, message, timestamp: now(), ...(fields ? { fields } : {}) });
const page = (all, p, s) => {
  const content = all.slice(p * s, p * s + s);
  const totalPages = Math.max(1, Math.ceil(all.length / s));
  return { content, page: { number: p, size: s, totalElements: all.length, totalPages, first: p === 0, last: p >= totalPages - 1, numberOfElements: content.length } };
};

const ME = { uuid: '3f1c2a9e-7b4d-4c1e-9a0f-2d6b8e1f5a10', email: 'kim@example.com', name: '김루키' };
let failed = 0, lockedUntil = 0, seq = 100, refresh = null;
const docs = [
  { id: '12', type: 'JOB_POSTING', title: '카카오 백엔드 신입 공고', charCount: 2310, createdAt: '2026-11-06T10:00:00+09:00', content: '자격요건: Java, Spring Boot, JPA, MySQL, Docker 경험. 우대: Kubernetes, AWS, Kafka.', maskedCount: 0 },
  { id: '15', type: 'RESUME', title: '내 이력서 v2', charCount: 1820, createdAt: '2026-11-06T10:05:00+09:00', content: '연락처 010-****-**** · a***@x.com\n기술: Java, Spring Boot, JPA, React, Docker', maskedCount: 2 },
  { id: '16', type: 'RESUME', title: '내 이력서 <img src=x onerror=alert(1)>', charCount: 40, createdAt: '2026-11-06T10:06:00+09:00', content: 'XSS 렌더 확인용 제목', maskedCount: 0 },
];
const messages = { '7': [
  { id: '30', role: 'USER', content: '갭 분석 리포트', sources: [], createdAt: '2026-11-06T10:10:00+09:00' },
  { id: '31', role: 'ASSISTANT', content: '## 요구 기술\n| 기술 | 보유 |\n|---|---|\n| Kubernetes | 없음 |', sources: [{ type: 'doc', documentId: '12', docType: 'JOB_POSTING', chunk: '우대: Kubernetes, AWS', score: 0.82 }], createdAt: '2026-11-06T10:10:20+09:00' },
  { id: '32', role: 'USER', content: '중단된 질문 예시', sources: [], createdAt: '2026-11-06T10:12:00+09:00' },
] };
const analyses = [{ id: '7', title: '카카오 백엔드 신입 공고 × 내 이력서 v2', postingTitle: '카카오 백엔드 신입 공고', resumeTitle: '내 이력서 v2', createdAt: '2026-11-06T10:10:00+09:00' }];
const analysisView = a => { const ms = messages[a.id] ?? []; return { ...a, messageCount: ms.length, lastStatus: ms.at(-1)?.role === 'ASSISTANT' ? 'DONE' : 'INCOMPLETE' }; };

const CORS = { 'Access-Control-Allow-Origin': 'http://localhost:5173', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE' };
const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...CORS }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });
const json = buf => { try { return JSON.parse(buf.toString('utf8') || '{}'); } catch { return null; } };
const pageParams = (q, max = 50) => {
  const p = Number(q.get('page') ?? 0), s = Number(q.get('size') ?? 20);
  if (!Number.isInteger(p) || !Number.isInteger(s) || p < 0 || s < 1) return null;
  return [p, Math.min(s, max)];
};
const summary = ({ content, maskedCount, ...d }) => d;
const badJson = res => send(res, 400, err(400, 'VALIDATION_ERROR', '요청 본문이 JSON이 아닙니다'));

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'); const path = u.pathname; const m = req.method;
  if (m === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const body = await readBody(req);

  // ── auth (인증 불필요 셋) ──
  if (m === 'POST' && path === '/api/auth/register') {
    const b = json(body); if (!b) return badJson(res);
    const fields = [];
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email ?? '')) fields.push({ field: 'email', message: '이메일 형식이 아닙니다' });
    if ((b.password ?? '').length < 8 || b.password.length > 64) fields.push({ field: 'password', message: '8~64자' });
    if (!b.name || b.name.length > 20) fields.push({ field: 'name', message: '1~20자' });
    if (fields.length) return send(res, 400, err(400, 'VALIDATION_ERROR', '입력값을 확인하세요', fields));
    if (b.email === ME.email) return send(res, 409, err(409, 'DUPLICATE_EMAIL', '이미 가입된 이메일입니다'));
    return send(res, 201, ok({ uuid: crypto.randomUUID(), email: b.email, name: b.name }, '회원가입이 완료되었습니다'));
  }
  if (m === 'POST' && path === '/api/auth/login') {
    const b = json(body); if (!b) return badJson(res);
    if (b.email === ME.email && Date.now() < lockedUntil) return send(res, 423, err(423, 'ACCOUNT_LOCKED', `로그인 5회 실패로 잠겼습니다. 해제: ${new Date(lockedUntil + 9 * 3600e3).toISOString().slice(11, 19)}`));
    if (b.email !== ME.email || b.password !== 'Passw0rd!') {
      if (b.email === ME.email && ++failed >= 5) { lockedUntil = Date.now() + 60e3; failed = 0; }   // 존재하는 계정만 센다
      return send(res, 401, err(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다'));
    }
    failed = 0; refresh = `mock-refresh-${Date.now()}`;
    return send(res, 200, ok({ accessToken: `mock-access-${Date.now()}`, refreshToken: refresh, user: ME }, '로그인되었습니다'));
  }
  if (m === 'POST' && path === '/api/auth/refresh') {
    const b = json(body); if (!b) return badJson(res);
    if (!refresh || b.refreshToken !== refresh) return send(res, 401, err(401, 'INVALID_REFRESH_TOKEN', '다시 로그인하세요'));
    refresh = `mock-refresh-${Date.now()}-${++seq}`;                                                      // 회전 — 이전 값은 즉시 무효
    return send(res, 200, ok({ accessToken: `mock-access-${Date.now()}`, refreshToken: refresh }));
  }
  if (!path.startsWith('/api/')) return send(res, 404, err(404, 'NOT_FOUND', '없는 경로입니다'));
  const auth = req.headers.authorization ?? '';
  if (auth === 'Bearer mock-expired') return send(res, 401, err(401, 'TOKEN_EXPIRED', '토큰이 만료되었습니다'));
  if (!/^Bearer mock-access-/.test(auth)) return send(res, 401, err(401, 'UNAUTHORIZED', '로그인이 필요합니다'));
  if (m === 'POST' && path === '/api/auth/logout') { refresh = null; return send(res, 200, ok(null, '로그아웃되었습니다')); }

  // ── documents ──
  if (m === 'GET' && path === '/api/documents') {
    const pp = pageParams(u.searchParams); const sort = u.searchParams.get('sort') ?? 'createdAt,desc'; const type = u.searchParams.get('type');
    if (!pp || !/^(createdAt|title),(asc|desc)$/.test(sort) || (type && !/^(JOB_POSTING|RESUME)$/.test(type))) return send(res, 400, err(400, 'VALIDATION_ERROR', '목록 조건을 확인하세요', [{ field: 'sort', message: 'createdAt|title , asc|desc' }]));
    const [k, dir] = sort.split(',');
    const list = docs.filter(d => !type || d.type === type).sort((a, b) => (a[k] < b[k] ? -1 : 1) * (dir === 'asc' ? 1 : -1)).map(summary);
    return send(res, 200, ok(page(list, ...pp)));
  }
  let mm;
  if ((mm = path.match(/^\/api\/documents\/([^/]+)$/))) {
    if (mm[1] === '99') return send(res, 403, err(403, 'FORBIDDEN', '접근 권한이 없습니다'));          // 소유 → 존재 → 입력 순서
    const d = docs.find(x => x.id === mm[1]);
    if (!d) return send(res, 404, err(404, 'DOCUMENT_NOT_FOUND', '문서를 찾을 수 없습니다'));
    if (m === 'GET') return send(res, 200, ok(d));
    if (m === 'PUT') {
      const b = json(body); if (!b) return badJson(res);
      if (!b.title || b.title.length > 100) return send(res, 400, err(400, 'VALIDATION_ERROR', '제목은 1~100자', [{ field: 'title', message: '1~100자' }]));
      if (docs.some(x => x !== d && x.title === b.title)) return send(res, 409, err(409, 'DUPLICATE_TITLE', '같은 제목의 문서가 있습니다'));
      d.title = b.title; return send(res, 200, ok(summary(d), '제목이 수정되었습니다'));
    }
    if (m === 'DELETE') { docs.splice(docs.indexOf(d), 1); return send(res, 200, ok(null, '삭제되었습니다')); }
  }
  if (m === 'POST' && path === '/api/documents') {
    // multipart를 완전히 파싱하지 않는다 — 파일명·크기·type·title만 본다(계약 형태 확인용).
    const raw = body.toString('latin1'); const fn = Buffer.from(raw.match(/filename="([^"]*)"/)?.[1] ?? '', 'latin1').toString('utf8');
    const part = n => Buffer.from(raw.match(new RegExp(`name="${n}"\\r\\n\\r\\n([^\\r]*)`))?.[1] ?? '', 'latin1').toString('utf8');
    const hs = raw.indexOf('\r\n\r\n', raw.indexOf('filename=')); const fe = raw.indexOf('\r\n--', hs + 4);
    const fileBytes = hs > 0 && fe > hs ? fe - hs - 4 : 0;
    if (fileBytes > 200 * 1024) return send(res, 413, err(413, 'FILE_TOO_LARGE', '200KB 이하 파일만 올릴 수 있습니다'));
    if (!/\.(md|txt)$/i.test(fn)) return send(res, 415, err(415, 'UNSUPPORTED_FILE', '.md 또는 .txt(UTF-8) 파일만 올릴 수 있습니다'));
    const type = part('type'), title = part('title');
    if (!fileBytes || !/^(JOB_POSTING|RESUME)$/.test(type) || !title || title.length > 100) return send(res, 400, err(400, 'VALIDATION_ERROR', '파일·종류·제목을 확인하세요', [{ field: 'title', message: '1~100자' }]));
    if (docs.some(x => x.title === title)) return send(res, 409, err(409, 'DUPLICATE_TITLE', '같은 제목의 문서가 있습니다'));
    const d = { id: String(++seq), type, title, charCount: fileBytes, createdAt: now(), content: '(마스킹된 본문)', maskedCount: 1 };
    docs.push(d); return send(res, 201, ok(summary(d), '업로드되었습니다'));
  }

  // ── analyses ──
  if (m === 'GET' && path === '/api/analyses') { const pp = pageParams(u.searchParams); if (!pp) return send(res, 400, err(400, 'VALIDATION_ERROR', 'page/size')); return send(res, 200, ok(page(analyses.map(analysisView), ...pp))); }
  if ((mm = path.match(/^\/api\/analyses\/([^/]+)\/messages$/)) && m === 'GET') {
    if (mm[1] === '99') return send(res, 403, err(403, 'FORBIDDEN', '접근 권한이 없습니다'));
    if (!messages[mm[1]]) return send(res, 404, err(404, 'ANALYSIS_NOT_FOUND', '분석을 찾을 수 없습니다'));
    const pp = pageParams(u.searchParams); if (!pp) return send(res, 400, err(400, 'VALIDATION_ERROR', 'page/size'));
    return send(res, 200, ok(page(messages[mm[1]], ...pp)));
  }
  if (m === 'POST' && path === '/api/analyses/stream') {
    const b = json(body); if (!b) return badJson(res);
    // 검증 순서: 소유(403) → 존재(404) → 입력(400)
    if ([b.postingId, b.resumeId, b.analysisId].includes('99')) return send(res, 403, err(403, 'FORBIDDEN', '접근 권한이 없습니다'));
    if (b.analysisId && !messages[b.analysisId]) return send(res, 404, err(404, 'ANALYSIS_NOT_FOUND', '분석을 찾을 수 없습니다'));
    if (!b.analysisId && [b.postingId, b.resumeId].some(id => !docs.find(d => d.id === id))) return send(res, 404, err(404, 'DOCUMENT_NOT_FOUND', '문서를 찾을 수 없습니다'));
    if (b.analysisId && (!String(b.question ?? '').trim() || String(b.question).length > 1000)) return send(res, 400, err(400, 'VALIDATION_ERROR', '질문은 1~1000자', [{ field: 'question', message: '1~1000자' }]));
    if (!b.analysisId && (docs.find(d => d.id === b.postingId).type !== 'JOB_POSTING' || docs.find(d => d.id === b.resumeId).type !== 'RESUME')) return send(res, 400, err(400, 'DOCUMENT_TYPE_MISMATCH', '공고와 이력서를 각각 골라 주세요'));
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no', ...CORS });
    const ev = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`);
    const id = b.analysisId ?? String(++seq);
    if (!b.analysisId) {
      const p = docs.find(d => d.id === b.postingId), r = docs.find(d => d.id === b.resumeId);
      analyses.unshift({ id, title: `${p.title} × ${r.title}`.slice(0, 100), postingTitle: p.title, resumeTitle: r.title, createdAt: now() }); messages[id] = [];
      ev('analysis', { analysisId: id });
    }
    messages[id].push({ id: String(++seq), role: 'USER', content: b.question || '갭 분석 리포트', sources: [], createdAt: now() });
    if (u.searchParams.get('fail') === '1') { ev('error', err(503, 'AI_UNAVAILABLE', '분석 서버가 응답하지 않습니다')); return res.end(); }   // 검증 뒤 장애는 상태코드가 아니라 event: error
    const toks = ['## 요구 기술\n', '| 기술 | 보유 |\n|---|---|\n', '| Spring Boot | 보유 |\n', '| Kubernetes | 없음 |\n', '\n## 준비 순서\n1. Kubernetes 기초'];
    let i = 0; let closed = false; res.on('close', () => { closed = true; });
    const t = setInterval(() => {
      if (closed) return clearInterval(t);
      if (i < toks.length) return ev('token', toks[i++]);
      clearInterval(t);
      ev('sources', [{ type: 'doc', documentId: '12', docType: 'JOB_POSTING', chunk: '우대: Kubernetes, AWS', score: 0.82 }, { type: 'web', url: 'https://example.com/news', title: '기업 기술 블로그' }]);
      const mid = String(++seq); messages[id].push({ id: mid, role: 'ASSISTANT', content: toks.join(''), sources: [], createdAt: now() });   // 완주했을 때만 저장
      ev('done', { messageId: mid }); res.end();
    }, 150);
    return;
  }
  return send(res, 404, err(404, 'NOT_FOUND', '없는 경로입니다'));
}).listen(PORT, () => console.log(`mock backend on http://localhost:${PORT}`));
