#!/usr/bin/env node
// check-sec-deploy.mjs — 프로파일 P3(AI+보안+배포) 정적 보안·배포 검사
// 사용: node scripts/check-sec-deploy.mjs [--public frontend,nginx] [--no-history]
//   리포 루트에서 실행. 무출력 + exit 0 이 정상. RED 줄이 하나라도 있으면 exit 1.
//   [권장] 줄은 exit 코드에 영향 없음 — 점검서에 "해당 없음/미조치 사유"로 닫는다.
// 출력 형식: RED|[권장]  <점검서 행 ID>  <파일:줄 또는 커밋>  <무엇>  → <볼 곳>
// 행 ID는 교육과정 9번 보안 점검서 템플릿(B-/F-/A-/I-)의 번호다 — 출력 한 줄이 점검서 한 행의 "점검 방법" 증거다.
// 이 스크립트가 보지 않는 것: IDOR·Brute Force·토큰 만료(실행 중 서버 대상 — Burp·curl 재현이 증거),
//   권한 grep B5/B6(chapters/api-contract.md 인증 계약이 정본 — 여기 복제하지 않는다).
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const pubIdx = args.indexOf('--public');
const PUBLIC = new Set((pubIdx >= 0 ? args[pubIdx + 1] : 'frontend,nginx').split(',').map(s => s.trim()));
const HISTORY = !args.includes('--no-history');

// security/ACCEPTED.txt — 원장이 닫은 이력 RED(키 폐기 완료)를 사람이 승인해 둔 목록.
// 한 줄 = "<커밋해시 또는 history:경로>  <이유 한 줄>" · 이력(commit/history:) 항목에만 적용된다 — 현재 파일 RED는 못 숨긴다.
const ACCEPTED = (() => { try { return readFileSync('security/ACCEPTED.txt', 'utf8').split('\n').map(l => l.trim().split(/\s+/)[0]).filter(t => t && !t.startsWith('#')); } catch { return []; } })();
let red = 0;
const out = [];
const RED = (id, where, what, see) => {
  if (/^(commit |history:)/.test(where) && ACCEPTED.some(t => where === `commit ${t}` || where === t || (t.length >= 7 && where.startsWith(`commit ${t.slice(0, 7)}`)))) return;
  red++; out.push(`RED     ${id}  ${where}  ${what}  → ${see}`);
};
const REC = (id, where, what, see) => out.push(`[권장]  ${id}  ${where}  ${what}  → ${see}`);

function sh(cmd) { try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }); } catch { return ''; } }

if (!sh('git rev-parse --is-inside-work-tree').trim()) { console.error('git 리포 루트에서 실행하세요'); process.exit(2); }
const files = sh('git -c core.quotepath=off ls-files').split('\n').filter(Boolean);
const read = f => { try { return readFileSync(f, 'utf8'); } catch { return ''; } };
const eachLine = (f, re, cb) => read(f).split('\n').forEach((l, i) => { if (re.test(l)) cb(i + 1, l); });

const isExample = f => /\.example$|\.sample$|example\.|(^|\/)tests?\/|\/src\/test\/|__tests__|\.test\.|\.spec\.|(^|\/)test_[^/]+\.py$|(^|\/)conftest\.py$/.test(f);
const isDoc = f => /\.md$/i.test(f);
const isEnvFile = f => /(^|\/)\.env(\.[^/]*)?$/.test(f);
// .env류 파일 안의 비밀값 줄 — 키 이름이 비밀이고 값이 비어 있지 않은 줄 (VITE_API_URL= 같은 공개값은 비밀이 아니다)
const ENV_SECRET = /^\s*(export\s+)?[A-Z0-9_]*(SECRET|PASSWORD|PASSWD|PWD|API_?KEY|TOKEN|PRIVATE_KEY)[A-Z0-9_]*\s*=\s*\S/i;

// ── I-1 비밀정보 ─────────────────────────────────────────────
// (a) 추적되는 .env 파일 안에 비밀값이 있는가 (파일이 있는 것 자체는 Vite의 공개 설정일 수 있다)
for (const f of files) if (isEnvFile(f) && !isExample(f)) eachLine(f, ENV_SECRET, n => RED('I-1', `${f}:${n}`, '.env 파일에 비밀값이 커밋됨', '.gitignore + git rm --cached · 키 폐기(재발급)'));
// (b) 알려진 키 접두어 (OpenAI·Groq·Tavily·Google·LangSmith·GitHub·AWS) — 앞이 영문자면 키가 아니다(risk-… 같은 낱말)
const KEYRE = /(^|[^A-Za-z0-9])(sk-(proj-)?[A-Za-z0-9_-]{20,}|gsk_[A-Za-z0-9]{20,}|tvly-[A-Za-z0-9-]{16,}|AIza[0-9A-Za-z_-]{35}|lsv2_[a-z]{2}_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16})/;
for (const f of files) if (!isDoc(f)) eachLine(f, KEYRE, n => RED('I-1', `${f}:${n}`, 'API 키 형태 문자열', '환경변수로 옮기고 키 폐기(재발급) — 커밋 삭제만으로는 부족'));
// (c) 설정·코드의 비밀값 리터럴 — 키 이름이 비밀이고, 값이 참조가 아닌 리터럴이거나 ${VAR:기본값}의 기본값이 리터럴
const CFG = /\.(properties|ya?ml|conf|py|java|js|mjs|jsx|ts)$/;
const SECRET_KEY = /^\s*-?\s*["']?([A-Za-z0-9_.-]*(secret|password|passwd|pwd|api[_-]?key|token)[A-Za-z0-9_.-]*)["']?\s*[:=]\s*(.*)$/i;
const NOT_SECRET_WORDS = new Set(['expiration', 'expire', 'expires', 'expiry', 'exp', 'validity', 'ttl', 'timeout', 'header', 'name', 'length', 'size', 'count', 'enabled', 'type', 'url', 'uri', 'path', 'endpoint', 'prefix', 'policy', 'strength', 'storage', 'id', 'ms', 'seconds']);
const notSecretName = k => k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).some(w => NOT_SECRET_WORDS.has(w.toLowerCase())); // 낱말 단위 — SECURITY 안의 uri 같은 부분 일치를 막는다
for (const f of files) if (CFG.test(f) && !isExample(f)) read(f).split('\n').forEach((l, i) => {
  const m = l.match(SECRET_KEY); if (!m) return;
  const key = m[1]; let v = m[3].trim().replace(/[,;]$/, '').replace(/^["']|["']$/g, '').trim();
  if (notSecretName(key)) return; // accessTokenExpiration · token-header · jwt-secret-length …
  const dflt = v.match(/^\$\{[A-Za-z0-9_.-]+:([^}]*)\}$/);
  // ${VAR:?메시지}·${VAR?메시지} = 필수 변수(값 없으면 기동 거부) — 기본값이 아니다 · ${VAR:-기본값}은 compose 기본값
  if (dflt && /^\?/.test(dflt[1])) return;
  if (dflt) dflt[1] = dflt[1].replace(/^-/, '');
  if (dflt) { if (dflt[1].trim().length >= 3) RED('I-1', `${f}:${i + 1}`, `비밀값 기본값 리터럴 '${key}'`, '${VAR} 만 쓰고 기본값을 비운다 — 기본값도 커밋된 비밀이다'); return; }
  if (!v || /^[$#{]/.test(v) || v.length < 3) return;
  if (/\s/.test(v) || /[^\x00-\x7F]/.test(v)) return;   // 공백·한글이 든 값은 문구다(비밀값은 공백 없는 ASCII) — 에러 메시지 맵 오탐 방지
  if (/^(true|false|null|none|undefined|required|optional|\d+)$/i.test(v)) return;
  if (/^(Bearer|ROLE_|getenv|os\.|process\.|System\.|env\(|secrets\.|settings\.|config\.)/.test(v) || /\(/.test(v)) return; // 코드 호출
  if (/\.(java|kt|py|m?js|jsx|tsx?)$/.test(f) && !/^["'`]/.test(m[3].trim())) return; // 코드 파일은 따옴표 리터럴만 비밀값 — 따옴표 없는 값은 식(token = res?.data ?? null)이다
  if (/password[A-Za-z]*\s*[:=]\s*(encoder|passwordEncoder|request|dto|req|body|user|member)\b/i.test(l)) return;
  RED('I-1', `${f}:${i + 1}`, `비밀값 리터럴 '${key}'`, '${ENV} 참조로 · K8s면 kubectl create secret --from-env-file (값을 커밋하지 않는다)');
});
// (d) Git 이력 — 지금 지워져 있어도 이력에 남았으면 RED (가이드 §3.3: 키 폐기 필요). 문서(.md)는 현재 검사와 같게 제외.
if (HISTORY) {
  const histRe = KEYRE.source.replace(/'/g, '').replace('(^|[^A-Za-z0-9])', '(^|[^A-Za-z0-9])');
  for (const h of sh(`git log --all --format=%h -G '${histRe}' -- . ':(exclude)*.md'`).split('\n').filter(Boolean)) RED('I-1', `commit ${h}`, '이력에 API 키 형태 문자열', '키 폐기(재발급) 먼저 — 점검서 I-1 조치 칸에 폐기 일시');
  for (const p of new Set(sh('git -c core.quotepath=off log --all --format= --name-only').split('\n').filter(f => isEnvFile(f) && !isExample(f)))) {
    const added = sh(`git -c core.quotepath=off log --all -p --format= -- '${p.replace(/'/g, "'\\''")}'`).split('\n').filter(l => /^\+/.test(l) && ENV_SECRET.test(l.slice(1)));
    if (added.length) RED('I-1', `history:${p}`, '.env 비밀값이 과거 커밋에 들어간 적 있음', '그 안의 키 전부 폐기(재발급)');
  }
}

// ── I-3 포트 노출 (compose) ──────────────────────────────────
// services: 아래 서비스 블록의 ports 항목을 하나씩 본다. --public 에 없는 서비스가 127.0.0.1 밖으로 게시하면 RED.
// 주석·빈 줄은 블록 경계로 보지 않는다. 127.0.0.1:/localhost: 바인드는 호스트 밖으로 안 나가므로 통과(dev 파일 용도).
for (const f of files.filter(f => /(^|\/)(docker-)?compose[^/]*\.ya?ml$/.test(f))) {
  let inServices = false, svc = null, svcIndent = -1, portsIndent = -1;
  const check = (item, n) => {
    const v = item.replace(/["'\s]/g, '');
    if (!v || PUBLIC.has(svc) || /^(127\.0\.0\.1|localhost|\[::1\]):/.test(v)) return;
    RED('I-3', `${f}:${n}`, `서비스 '${svc}'가 호스트 포트를 게시 (${v})`, 'ports 삭제(내부 네트워크만) · 디버깅은 docker-compose.dev.yml에 127.0.0.1:포트:포트');
  };
  read(f).split('\n').forEach((l, i) => {
    if (/^\s*(#.*)?$/.test(l)) return;
    if (/^services:\s*(#.*)?$/.test(l)) { inServices = true; return; }
    if (/^\S/.test(l)) { inServices = false; svc = null; return; }
    if (!inServices) return;
    const ind = l.match(/^(\s*)/)[1].length;
    if (portsIndent >= 0) { if (ind > portsIndent && /^\s*-\s*/.test(l)) { check(l.replace(/^\s*-\s*/, '').replace(/#.*$/, ''), i + 1); return; } portsIndent = -1; }
    const m = l.match(/^(\s+)([A-Za-z0-9_.-]+):\s*(#.*)?$/);
    if (m && (svcIndent < 0 || m[1].length <= svcIndent)) { svcIndent = m[1].length; svc = m[2]; return; }
    const pm = l.match(/^(\s+)ports:\s*(.*)$/);
    if (svc && pm) {
      const inline = pm[2].replace(/#.*$/, '').trim();
      if (inline.startsWith('[')) inline.slice(1, -1).split(',').forEach(x => check(x, i + 1)); else portsIndent = pm[1].length;
    }
  });
}

// ── I-4 이미지 태그 고정 · I-2 비root ─────────────────────────
for (const f of files.filter(f => /(^|\/)(docker-)?compose[^/]*\.ya?ml$/.test(f))) eachLine(f, /^\s*image:\s*\S+/, (n, l) => {
  const img = l.split('image:')[1].replace(/#.*$/, '').trim().replace(/["']/g, '');
  if (/\$\{/.test(img)) return;
  if (/:latest$/.test(img) || !/[:@]/.test(img.split('/').pop())) RED('I-4', `${f}:${n}`, `태그 미고정 이미지 '${img}'`, '버전 태그 또는 ${GITHUB_SHA} 태그');
});
for (const f of files.filter(f => /(^|\/)[^/]*Dockerfile[^/]*$/.test(f))) {
  const t = read(f); const stagesNamed = new Set();
  t.split('\n').forEach((l, i) => {
    const m = l.match(/^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)(?:\s+AS\s+(\S+))?/i); if (!m) return;
    const img = m[1];
    if (img !== 'scratch' && !/\$/.test(img) && !stagesNamed.has(img.toLowerCase()) && (/:latest$/.test(img) || !/[:@]/.test(img))) RED('I-4', `${f}:${i + 1}`, `베이스 이미지 태그 미고정 '${img}'`, '버전 태그 고정');
    if (m[2]) stagesNamed.add(m[2].toLowerCase());
  });
  const stages = t.split(/^\s*FROM\s/im); const last = stages[stages.length - 1] || '';
  if (!/^\s*USER\s+(?!root\b|0\b)\S+/im.test(last) && !/^nginx|^\S*nginx/i.test(last.trim())) REC('I-2', f, '마지막 스테이지에 비root USER 없음', 'useradd/adduser + USER');
  if (!/^\s*HEALTHCHECK\s/im.test(t) && !/^nginx|^\S*nginx/i.test(last.trim())) REC('배포', f, 'HEALTHCHECK 없음', '평가표 Dockerfile 품질 항목 — compose healthcheck로 대신했으면 무시');
}

// ── B-7 보안 설정 오류 · 배포(Flyway) ─────────────────────────
for (const f of files.filter(f => /application[^/]*\.(properties|ya?ml)$/.test(f) && !isExample(f))) {
  if (/\bh2:\s*\n\s+console:\s*\n\s+enabled:\s*true/.test(read(f))) RED('B-7', f, 'H2 콘솔 활성(중첩 YAML)', '로컬 프로파일 밖으로 · 배포 프로파일 false');
  eachLine(f, /exposure\.include\s*[=:]\s*["']?\*|include:\s*["']?\*["']?\s*$/, n => RED('B-7', `${f}:${n}`, 'Actuator 전체 노출(*)', '${ACTUATOR_EXPOSURE:health,info} + /actuator/** ADMIN'));
  eachLine(f, /show-values\s*[=:]\s*always/, n => RED('B-7', `${f}:${n}`, 'env 값 노출 show-values=always', 'never(기본값)'));
  eachLine(f, /ddl-auto\s*[=:]\s*(update|create|create-drop)\b/, (n, l) => RED('배포', `${f}:${n}`, `ddl-auto=${l.match(/(update|create-drop|create)/)[1]}`, 'validate + Flyway (평가표 배포 항목)'));
  eachLine(f, /h2\.console\.enabled\s*[=:]\s*true/, n => RED('B-7', `${f}:${n}`, 'H2 콘솔 활성', '로컬 프로파일 밖으로 · 배포 프로파일 false'));
  eachLine(f, /jdbc\.bind\s*[=:]\s*TRACE|BasicBinder\s*[=:]\s*TRACE/i, n => REC('B-9', `${f}:${n}`, 'SQL 바인드 파라미터 TRACE 로깅(해시·개인정보가 로그로)', '배포 프로파일에서 끈다'));
}
for (const f of files.filter(f => /\.(java|kt)$/.test(f))) eachLine(f, /allowedOrigin(s|Patterns)\s*\(\s*"\*"|addAllowedOrigin(Pattern)?\s*\(\s*"\*"|setAllowedOrigins\s*\(\s*(List|Arrays)\.(of|asList)\s*\(\s*"\*"/, n => RED('B-7', `${f}:${n}`, 'CORS 전체 허용(*)', '허용 Origin 한정 (환경변수)'));
for (const f of files.filter(f => /nginx[^/]*\.conf$|\.conf$/.test(f))) {
  eachLine(f, /Access-Control-Allow-Origin['"]?\s+['"]?\*/, n => RED('B-7', `${f}:${n}`, 'nginx CORS *', 'Origin 한정 또는 제거(같은 출처면 불필요)'));
  eachLine(f, /^\s*autoindex\s+on/, n => RED('B-2', `${f}:${n}`, 'autoindex on — 저장 파일 목록이 인증 없이 열림', '파일은 백엔드 경유 다운로드(소유자 검증) · nginx 직접 서빙 금지'));
}

// ── F-1 XSS · F-4 프론트 민감정보 ─────────────────────────────
for (const f of files.filter(f => /\.(jsx?|tsx?)$/.test(f) && !/node_modules/.test(f))) eachLine(f, /dangerouslySetInnerHTML/, n => RED('F-1', `${f}:${n}`, 'dangerouslySetInnerHTML', '텍스트 렌더 또는 DOMPurify sanitize (AI 응답 렌더링 포함)'));
for (const f of files.filter(f => /(^|\/)\.env|vite\.config|\.(jsx?|tsx?)$/.test(f) && !/node_modules/.test(f))) eachLine(f, /VITE_[A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD)/, n => RED('F-4', `${f}:${n}`, 'VITE_* 변수에 키/비밀 — 번들에 그대로 박힌다', '백엔드 경유 호출'));

for (const l of out) console.log(l);
process.exit(red ? 1 : 0);
