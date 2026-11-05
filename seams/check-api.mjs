// seams/check-api.mjs — 첫째 seam(프론트 ↔ 백엔드) 계약 검사 · SPEC.md §4 · 의존성 0 (Node 18+)
// 실행: node seams/check-api.mjs [base]
//   목      node seams/check-api.mjs http://localhost:8080   (node mock/server.mjs)
//   compose node seams/check-api.mjs http://localhost        (nginx 경유 — backend 포트는 공개 안 함)
// env: CHECK_EMAIL · CHECK_PASSWORD(시드 kim) · OTHER_DOC_ID · OTHER_ANALYSIS_ID(시드 lee의 문서·분석 id — 목은 둘 다 99)
// 순서: 응답함 → 상태코드 → 봉투 → 필드 존재 → 타입 → 값 형식 → 에러 케이스. 쓰기 검사는 자기가 만든 것만 지운다.
const BASE = (process.argv[2] ?? 'http://localhost:8080').replace(/\/$/, '');
const EMAIL = process.env.CHECK_EMAIL ?? 'kim@example.com', PW = process.env.CHECK_PASSWORD ?? 'Passw0rd!';
const OTHER = process.env.OTHER_DOC_ID ?? '99', OTHER_AN = process.env.OTHER_ANALYSIS_ID ?? '99';
let refreshTok = null;
const report = []; let token = null;

async function call(method, path, body, { raw = false, headers = {} } = {}) {
  try {
    const h = { ...headers }; if (token) h.Authorization = `Bearer ${token}`;
    let payload;
    if (body instanceof FormData) payload = body; else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const r = await fetch(BASE + path, { method, headers: h, body: payload, signal: AbortSignal.timeout(raw ? 60000 : 8000) });
    if (raw) return { status: r.status, text: await r.text(), type: r.headers.get('content-type') ?? '' };
    let b; try { b = await r.json(); } catch { b = undefined; }
    return { status: r.status, body: b };
  } catch (e) { return { status: 0, down: true, msg: e.message }; }
}
const isErr = b => b && b.success === false && typeof b.code === 'string' && typeof b.statusCode === 'number';
function env(b, errs) { if (!b || b.success !== true) errs.push(`success≠true: ${JSON.stringify(b)?.slice(0, 120)}`); for (const k of ['data', 'message', 'timestamp']) if (!b || !(k in b)) errs.push(`봉투 필드 없음: ${k}`); if (b?.timestamp && !/\+09:00$/.test(b.timestamp)) errs.push(`timestamp ${b.timestamp} — +09:00 아님 (SPEC §1 시간 · TZ·jackson time-zone)`); return b?.data; }
function fields(o, spec, where, errs) { for (const [k, t] of spec) { if (!o || !(k in o)) errs.push(`${where}.${k} 없음`); else if (o[k] === null) errs.push(`${where}.${k} null`); else if (t === 'array' ? !Array.isArray(o[k]) : typeof o[k] !== t) errs.push(`${where}.${k} 타입 ${typeof o[k]} (계약 ${t})`); } }
function pageShape(d, errs) { if (!Array.isArray(d?.content)) errs.push('data.content 배열 아님'); for (const k of ['number', 'size', 'totalElements', 'totalPages', 'first', 'last', 'numberOfElements']) if (!d?.page || !(k in d.page)) errs.push(`data.page.${k} 없음`); if (d?.page && d.page.number !== 0) errs.push(`page.number=${d.page.number} (요청 0 — 1-base 변환 의심)`); }
async function check(name, fn) { const errs = []; try { await fn(errs); } catch (e) { errs.push(`검사 예외: ${e.message}`); } report.push([name, errs]); }
const expectErr = (r, status, code, errs) => { if (r.down) errs.push(`응답 없음: ${r.msg}`); else if (r.status !== status) errs.push(`상태 ${r.status} (계약 ${status} ${code})`); else if (!isErr(r.body)) errs.push('에러 봉투 아님 (Spring 기본 에러/HTML? — Advice·nginx 확인)'); else if (code && r.body.code !== code) errs.push(`code ${r.body.code} (계약 ${code})`); };

const DOC = [['id', 'string'], ['type', 'string'], ['title', 'string'], ['charCount', 'number'], ['createdAt', 'string']];

await check('POST /api/auth/login', async errs => {
  const r = await call('POST', '/api/auth/login', { email: EMAIL, password: PW });
  if (r.down) return errs.push(`서버 응답 없음: ${r.msg}`);
  if (r.body === undefined) return errs.push(`JSON 아님 (base URL·포트·nginx 확인) 상태 ${r.status}`);
  if (r.status !== 200) return errs.push(`상태 ${r.status} — 시드 사용자(${EMAIL})가 있나? 잠겼나(423)?`);
  const d = env(r.body, errs); fields(d, [['accessToken', 'string'], ['refreshToken', 'string'], ['user', 'object']], 'data', errs);
  fields(d?.user, [['uuid', 'string'], ['email', 'string'], ['name', 'string']], 'data.user', errs);
  token = d?.accessToken ?? null; refreshTok = d?.refreshToken ?? null;
});
if (!token) { print(); process.exit(1); }

await check('로그인 실패 = 401 INVALID_CREDENTIALS 봉투', async errs => { const t = token; token = null; expectErr(await call('POST', '/api/auth/login', { email: 'nobody@example.com', password: 'wrong-pass' }), 401, 'INVALID_CREDENTIALS', errs); token = t; });
await check('토큰 없음 = 401 봉투', async errs => { const t = token; token = null; expectErr(await call('GET', '/api/documents'), 401, null, errs); token = t; });
await check('POST /api/auth/register 검증 400 fields[]', async errs => { const t = token; token = null; const r = await call('POST', '/api/auth/register', { email: 'not-an-email', password: '1', name: '' }); expectErr(r, 400, 'VALIDATION_ERROR', errs); if (r.body && !Array.isArray(r.body.fields)) errs.push('fields[] 없음'); token = t; });

let firstDoc = null;
await check('GET /api/documents (page·sort)', async errs => {
  const r = await call('GET', '/api/documents?page=0&size=20&sort=createdAt,desc');
  if (r.status !== 200) return errs.push(`상태 ${r.status}`);
  const d = env(r.body, errs); pageShape(d, errs);
  if (d?.content?.length) { fields(d.content[0], DOC, 'content[0]', errs); firstDoc = d.content[0]; if ('content' in d.content[0]) errs.push('목록에 본문(content)이 섞였다 — 상세에서만'); if (Number.isNaN(Date.parse(d.content[0].createdAt))) errs.push('createdAt 파싱 불가'); }
  else errs.push('문서 0건 — 시드(V2__seed.sql)가 안 돌았다');
});
await check('GET /api/documents?type=RESUME 필터', async errs => { const r = await call('GET', '/api/documents?type=RESUME&page=0&size=20'); const d = env(r.body, errs); if (d?.content?.some(x => x.type !== 'RESUME')) errs.push('type 필터 무시됨'); });
await check('정렬 허용 목록 밖 = 400', async errs => expectErr(await call('GET', '/api/documents?sort=password,asc'), 400, 'VALIDATION_ERROR', errs));
await check('page 음수 = 400', async errs => expectErr(await call('GET', '/api/documents?page=-1'), 400, 'VALIDATION_ERROR', errs));
await check('GET /api/documents/{id} 상세', async errs => {
  if (!firstDoc) return errs.push('선행 목록 실패');
  const r = await call('GET', `/api/documents/${firstDoc.id}`); if (r.status !== 200) return errs.push(`상태 ${r.status}`);
  const d = env(r.body, errs); fields(d, [...DOC, ['content', 'string'], ['maskedCount', 'number']], 'data', errs);
  if (/01[016789]-?\d{3,4}-?\d{4}/.test(d?.content ?? '')) errs.push('본문에 마스킹 안 된 휴대폰 번호 (SPEC §6.5 · S-03)');
});
await check('남의 문서 = 403 FORBIDDEN (IDOR · S-01)', async errs => expectErr(await call('GET', `/api/documents/${OTHER}`), 403, 'FORBIDDEN', errs));
await check('없는 문서 = 404 DOCUMENT_NOT_FOUND', async errs => expectErr(await call('GET', '/api/documents/987654321'), 404, 'DOCUMENT_NOT_FOUND', errs));
await check('PUT 제목 빈 값 = 400', async errs => { if (firstDoc) expectErr(await call('PUT', `/api/documents/${firstDoc.id}`, { title: '' }), 400, 'VALIDATION_ERROR', errs); });

let created = null;
await check('POST /api/documents 업로드 → PUT → DELETE (자기 것만)', async errs => {
  const fd = new FormData(); fd.append('file', new Blob(['기술: Java, Spring\n연락처 010-1234-5678'], { type: 'text/markdown' }), 'check.md');
  fd.append('type', 'RESUME'); fd.append('title', `check-api ${Date.now()}`);
  const r = await call('POST', '/api/documents', fd);
  if (r.status === 503) return errs.push('503 AI_UNAVAILABLE — AI 서비스·내부 토큰 확인 (업로드는 AI 적재까지 한 묶음)');
  if (r.status !== 201) return errs.push(`업로드 상태 ${r.status} ${r.body?.code ?? ''}`);
  created = env(r.body, errs); fields(created, DOC, 'data', errs);
  const p = await call('PUT', `/api/documents/${created.id}`, { title: `${created.title} 수정` }); if (p.status !== 200) errs.push(`PUT 상태 ${p.status}`);
  const d = await call('DELETE', `/api/documents/${created.id}`); if (d.status !== 200) errs.push(`DELETE 상태 ${d.status}`);
  const g = await call('GET', `/api/documents/${created.id}`); if (g.status !== 404) errs.push(`삭제 후 조회 ${g.status} (계약 404)`);
});
await check('업로드 형식 밖(.exe) = 415', async errs => {
  const fd = new FormData(); fd.append('file', new Blob(['MZ'], { type: 'application/octet-stream' }), 'x.exe'); fd.append('type', 'RESUME'); fd.append('title', 'bad');
  expectErr(await call('POST', '/api/documents', fd), 415, 'UNSUPPORTED_FILE', errs);
});

await check('GET /api/analyses', async errs => { const r = await call('GET', '/api/analyses?page=0&size=20'); if (r.status !== 200) return errs.push(`상태 ${r.status}`); const d = env(r.body, errs); pageShape(d, errs); if (d?.content?.some(x => !/^(DONE|INCOMPLETE)$/.test(x.lastStatus))) errs.push('lastStatus는 DONE|INCOMPLETE'); if (d?.content?.length) fields(d.content[0], [['id', 'string'], ['title', 'string'], ['postingTitle', 'string'], ['resumeTitle', 'string'], ['messageCount', 'number'], ['lastStatus', 'string'], ['createdAt', 'string']], 'content[0]', errs); });
await check('남의 분석 메시지 = 403', async errs => expectErr(await call('GET', `/api/analyses/${OTHER_AN}/messages`), 403, 'FORBIDDEN', errs));
await check('남의 문서로 스트림 = 403 (스트림 열기 전 봉투)', async errs => expectErr(await call('POST', '/api/analyses/stream', { postingId: OTHER, resumeId: OTHER }), 403, 'FORBIDDEN', errs));
await check('업로드 200KB 초과 = 413 봉투 (nginx HTML 413이면 client_max_body_size 확인)', async errs => {
  const fd = new FormData(); fd.append('file', new Blob(['a'.repeat(300 * 1024)], { type: 'text/plain' }), 'big.txt'); fd.append('type', 'RESUME'); fd.append('title', `big ${Date.now()}`);
  expectErr(await call('POST', '/api/documents', fd), 413, 'FILE_TOO_LARGE', errs);
});

await check('POST /api/analyses/stream (SSE · 이벤트 순서)', async errs => {
  const list = (await call('GET', '/api/documents?page=0&size=50')).body?.data?.content ?? [];
  const posting = list.find(x => x.type === 'JOB_POSTING'), resume = list.find(x => x.type === 'RESUME');
  if (!posting || !resume) return errs.push('공고·이력서 시드가 각 1건 이상 필요');
  const mismatch = await call('POST', '/api/analyses/stream', { postingId: resume.id, resumeId: posting.id });
  expectErr(mismatch, 400, 'DOCUMENT_TYPE_MISMATCH', errs);
  const r = await call('POST', '/api/analyses/stream', { postingId: posting.id, resumeId: resume.id }, { raw: true });
  if (r.status !== 200) return errs.push(`상태 ${r.status} ${r.text.slice(0, 120)}`);
  if (!/text\/event-stream/.test(r.type)) errs.push(`Content-Type ${r.type}`);
  const evs = [...r.text.matchAll(/^event:\s?(\w+)\r?\ndata:\s?(.*)$/gm)].map(m => [m[1], m[2]]);
  const names = evs.map(e => e[0]);
  if (names[0] !== 'analysis') errs.push(`첫 이벤트 ${names[0]} (계약: 새 분석이면 analysis)`);
  if (!names.includes('token')) errs.push('token 이벤트 없음');
  for (const [n, d] of evs) if (n === 'token') { try { if (typeof JSON.parse(d) !== 'string') errs.push('token data가 JSON 문자열이 아님'); } catch { errs.push(`token data JSON 파싱 불가: ${d.slice(0, 40)} (SPEC §4.3 — 줄바꿈 토큰이 프레임을 깬다)`); break; } }
  const src = evs.find(e => e[0] === 'sources'); if (!src) errs.push('sources 없음'); else { try { const s = JSON.parse(src[1]); if (!Array.isArray(s) || s.some(x => !/^(doc|web)$/.test(x.type))) errs.push('sources 형식(type doc/web)'); } catch { errs.push('sources JSON 아님'); } }
  const done = evs.find(e => e[0] === 'done');
  if (names.at(-1) !== 'done') errs.push(`마지막 이벤트 ${names.at(-1)} (계약 done)`);
  else { try { if (typeof JSON.parse(done[1]).messageId !== 'string') errs.push('done.messageId 없음 — BE가 AI의 done을 그대로 흘렸다(SPEC §4.3 중계 규칙)'); } catch { errs.push('done data JSON 아님'); } }
  const aId = (() => { try { return JSON.parse(evs[0][1]).analysisId; } catch { return null; } })();
  if (aId) {
    const ms = await call('GET', `/api/analyses/${aId}/messages?page=0&size=50`);
    if (ms.status !== 200) errs.push(`방금 분석의 메시지 조회 ${ms.status}`);
    else { const c = ms.body?.data?.content ?? []; if (c.length) fields(c[0], [['id', 'string'], ['role', 'string'], ['content', 'string'], ['sources', 'array'], ['createdAt', 'string']], 'messages[0]', errs); }
    const fu = await call('POST', '/api/analyses/stream', { analysisId: aId, question: '' }); expectErr(fu, 400, 'VALIDATION_ERROR', errs);
  }
});

await check('refresh 회전 → 이전 refresh 401 → logout 뒤 refresh 401', async errs => {
  if (!refreshTok) return errs.push('로그인 응답에 refreshToken 없음');
  const t = token; token = null;
  const r1 = await call('POST', '/api/auth/refresh', { refreshToken: refreshTok });
  if (r1.status !== 200) { token = t; return errs.push(`refresh 상태 ${r1.status}`); }
  const d = env(r1.body, errs); const next = d?.refreshToken;
  if (!next || next === refreshTok) errs.push('refresh가 회전되지 않았다(같은 값)');
  expectErr(await call('POST', '/api/auth/refresh', { refreshToken: refreshTok }), 401, 'INVALID_REFRESH_TOKEN', errs);
  token = d?.accessToken ?? t;
  const lo = await call('POST', '/api/auth/logout'); if (lo.status !== 200) errs.push(`logout 상태 ${lo.status}`);
  token = null; expectErr(await call('POST', '/api/auth/refresh', { refreshToken: next }), 401, 'INVALID_REFRESH_TOKEN', errs); token = t;
});

print(); process.exit(report.some(([, e]) => e.length) ? 1 : 0);

function print() {
  for (const [name, errs] of report) { console.log(`${errs.length ? 'RED  ' : 'green'}  ${name}`); for (const e of errs) console.log(`         - ${e}`); }
  if (report.some(([, e]) => e.length)) console.log('\n누가 보나: 상태·봉투·필드 = BE(SPEC §4) · 목에서만 red = mock/server.mjs(기술 리드) · 프론트 화면 문제는 이 검사 범위 밖');
}
