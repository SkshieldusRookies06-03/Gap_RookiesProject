// seams/check-ai.mjs — 둘째 seam(백엔드 → AI) 계약 검사 · SPEC.md §6 · 의존성 0
// 실행: AI_INTERNAL_TOKEN=dev-token node seams/check-ai.mjs http://127.0.0.1:8000   (목이면 MOCK=1 을 붙여 장애 경로도 본다)
//   목:   cd ai-module && uvicorn mock_app:app --port 8000
//   실물: docker compose -f docker-compose.yml -f docker-compose.dev.yml up  (ai 8000이 127.0.0.1에만 바인드)
// 순서: 응답함 → 401(헤더 없음) → 상태코드 → 이벤트 이름 → done 도착 → 삭제 후 재질의에 그 문서 sources 없음
const BASE = (process.argv[2] ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
const TOKEN = process.env.AI_INTERNAL_TOKEN ?? 'dev-token';
const OWNER = '00000000-0000-4000-8000-00000000c4ec', OTHER = '00000000-0000-4000-8000-0000000000b2';
const POST_ID = `check-${Date.now()}-p`, RES_ID = `check-${Date.now()}-r`;
const report = [];
const call = async (method, path, body, auth = true) => {
  try {
    const h = { 'Content-Type': 'application/json' }; if (auth) h['X-Internal-Token'] = TOKEN;
    const r = await fetch(BASE + path, { method, headers: h, body: body && JSON.stringify(body), signal: AbortSignal.timeout(90000) });
    return { status: r.status, text: await r.text(), type: r.headers.get('content-type') ?? '' };
  } catch (e) { return { status: 0, down: true, text: e.message }; }
};
const events = t => [...t.matchAll(/^event:\s?(\w+)\r?\ndata:\s?(.*)$/gm)].map(m => [m[1], m[2]]);
async function check(name, fn) { const errs = []; try { await fn(errs); } catch (e) { errs.push(`검사 예외: ${e.message}`); } report.push([name, errs]); }
const analyzeBody = owner => ({ ownerUuid: owner, postingId: POST_ID, resumeId: RES_ID, postingTitle: '검사용 공고', mode: 'REPORT', question: '', history: [] });

await check('GET /health (토큰 없이 200)', async errs => { const r = await call('GET', '/health', undefined, false); if (r.down) return errs.push(`응답 없음: ${r.text}`); if (r.status !== 200) errs.push(`상태 ${r.status}`); });
if (report[0][1].length) { print(); process.exit(1); }
await check('내부 토큰 없음 = 401', async errs => { const r = await call('POST', '/internal/ingest', { documentId: 'x' }, false); if (r.status !== 401) errs.push(`상태 ${r.status} (계약 401 — A-1 2차 방어선)`); });
await check('스트림·삭제도 토큰 없으면 401', async errs => { for (const [m, p] of [['POST', '/internal/analyze/stream'], ['DELETE', '/internal/documents/x?ownerUuid=x']]) { const r = await call(m, p, m === 'POST' ? {} : undefined, false); if (r.status !== 401) errs.push(`${m} ${p} 상태 ${r.status}`); } });
await check('POST /internal/ingest ×2 = 201', async errs => {
  for (const [id, t] of [[POST_ID, 'JOB_POSTING'], [RES_ID, 'RESUME']]) {
    const r = await call('POST', '/internal/ingest', { documentId: id, ownerUuid: OWNER, docType: t, title: '검사', text: '자격요건: Java, Spring Boot, Docker. 우대: Kubernetes.' });
    if (r.status !== 201) { errs.push(`${t} 상태 ${r.status} ${r.text.slice(0, 100)}`); continue; }
    const b = JSON.parse(r.text); if (b.documentId !== id || typeof b.chunks !== 'number') errs.push(`응답 형태 ${r.text}`);
  }
});
await check('POST /internal/analyze/stream (token JSON · sources · done)', async errs => {
  const r = await call('POST', '/internal/analyze/stream', analyzeBody(OWNER));
  if (r.status !== 200) return errs.push(`상태 ${r.status}`);
  if (!/text\/event-stream/.test(r.type)) errs.push(`Content-Type ${r.type}`);
  const ev = events(r.text); const names = ev.map(e => e[0]);
  if (!names.includes('token')) errs.push('token 없음');
  for (const [n, d] of ev) if (n === 'token') { try { if (typeof JSON.parse(d) !== 'string') errs.push('token data가 문자열 아님'); } catch { errs.push(`token JSON 파싱 불가: ${d.slice(0, 30)}`); break; } }
  const s = ev.find(e => e[0] === 'sources'); const src = s ? JSON.parse(s[1]) : null;
  if (!src) errs.push('sources 없음'); else if (!src.some(x => x.type === 'doc' && x.documentId === POST_ID)) errs.push('방금 적재한 공고가 sources에 없음');
  if (names.at(-1) !== 'done') errs.push(`마지막 ${names.at(-1)} (계약 done)`);
});
await check('장애 경로 ?fail=1 → event: error 봉투 (목 전용 — 실물은 키를 비워 재현)', async errs => {
  if (!process.env.MOCK) return;
  const ev = events((await call('POST', '/internal/analyze/stream?fail=1', analyzeBody(OWNER))).text); const e = ev.find(x => x[0] === 'error');
  if (!e) errs.push('error 이벤트 없음'); else { const b = JSON.parse(e[1]); if (b.success !== false || !b.code || !b.timestamp) errs.push(`봉투 아님: ${e[1]}`); }
});
await check('owner 필터 — 다른 ownerUuid로 질의하면 그 문서가 안 나온다 (A-3)', async errs => {
  const ev = events((await call('POST', '/internal/analyze/stream', analyzeBody(OTHER))).text);
  const s = ev.find(e => e[0] === 'sources'); if (s && JSON.parse(s[1]).some(x => x.type === 'doc' && [POST_ID, RES_ID].includes(x.documentId))) errs.push('남의 문서 조각이 sources에 섞임');
});
await check('DELETE /internal/documents/{id} = 204 · 멱등 · 삭제 후 sources 없음', async errs => {
  for (const id of [POST_ID, RES_ID]) { const r = await call('DELETE', `/internal/documents/${id}?ownerUuid=${OWNER}`); if (r.status !== 204) errs.push(`삭제 상태 ${r.status}`); }
  const again = await call('DELETE', `/internal/documents/${POST_ID}?ownerUuid=${OWNER}`); if (again.status !== 204) errs.push(`재삭제 ${again.status} (계약 204 멱등)`);
  const ev = events((await call('POST', '/internal/analyze/stream', analyzeBody(OWNER))).text);
  const s = ev.find(e => e[0] === 'sources'); if (s && JSON.parse(s[1]).some(x => x.type === 'doc' && [POST_ID, RES_ID].includes(x.documentId))) errs.push('삭제한 문서가 아직 검색됨');
});

print(); process.exit(report.some(([, e]) => e.length) ? 1 : 0);
function print() { for (const [n, e] of report) { console.log(`${e.length ? 'RED  ' : 'green'}  ${n}`); for (const x of e) console.log(`         - ${x}`); } if (report.some(([, e]) => e.length)) console.log('\n누가 보나: AI 레인(SPEC §6) · 목에서만 red = ai-module/mock_app.py'); }
