#!/usr/bin/env node
// seams/check-scope.mjs — 역할·티켓 경계 검사 (spec-bootcamp-web §역할·티켓 분해)
//
//   node seams/check-scope.mjs T-009 [base]      PR 전: 이 브랜치가 티켓의 "수정 허용" 밖을 건드렸나
//   node seams/check-scope.mjs T-016,T-017       커밋이 티켓 둘에 걸치면 쉼표로 (허용 범위 합집합)
//   node seams/check-scope.mjs --overlap T-006 T-009 T-019
//                                               D1·아침: 동시에 열린 티켓들이 같은 파일을 노리나
//   node seams/check-scope.mjs --owners          D1: 추적 파일마다 오너가 정확히 하나인가 (.github/CODEOWNERS)
//
// 의존성 0 (Node 18+ · git). 리포 루트에서 실행한다. 출력 0줄 + exit 0이 정상.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const git = (...a) => execFileSync("git", ["-c", "core.quotepath=off", ...a], { encoding: "utf8" }).split("\n").filter(Boolean);
const fail = [];

// ── 티켓 읽기: tasks/T-###*.md 의 [제약] 안 "- 수정 허용:" · "- 승인된 남의 파일:" 줄(이어지는 들여쓴 줄 포함)
function ticket(id) {
  const dir = "tasks";
  const f = existsSync(dir) && readdirSync(dir).find((n) => n.startsWith(id + "-") || n === id + ".md");
  if (!f) { console.error(`티켓 파일 없음: tasks/${id}-*.md`); process.exit(2); }
  const lines = readFileSync(`${dir}/${f}`, "utf8").split("\n");
  const owner = (lines.find((l) => /\*\*담당:\*\*/.test(l)) ?? "").match(/\*\*담당:\*\*\s*([^·*\n]+)/)?.[1]?.trim() ?? "?";
  const allow = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^- (수정 허용|승인된 남의 파일):/.test(lines[i])) continue;
    let block = lines[i];
    for (let j = i + 1; j < lines.length && /^\s{2,}\S/.test(lines[j]); j++) block += " " + lines[j];
    for (const m of block.matchAll(/`([^`]+)`/g)) {
      const t = m[1].trim();
      if (/[/.*]/.test(t) && !/\s/.test(t)) allow.push(t);   // 경로처럼 생긴 것만 (코드 조각 제외)
    }
  }
  if (!allow.length) { console.error(`${f}: "- 수정 허용:" 줄에 백틱 경로가 없다 — 경계 없는 티켓은 열지 않는다`); process.exit(2); }
  return { id, file: f, owner, allow };
}

// ── 경로 패턴: `controller/X.java`·`pages/MyPage/`·`dto/Product*` 처럼 리포 어디의 접미사로도 맞춘다
function toRegex(p) {
  const dirOnly = p.endsWith("/");
  const body = p.replace(/\/$/, "").split("/").map((seg) =>
    seg === "**" ? "(?:[^/]+/)*?" : seg.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")).join("/")
    .replace(/\(\?:\[\^\/\]\+\/\)\*\?\//g, "(?:[^/]+/)*");
  return new RegExp(`(?:^|/)${body}${dirOnly ? "/" : "(?:$|/)"}`);
}
const matches = (path, pats) => pats.some((p) => toRegex(p).test(path));

// ── CODEOWNERS (GitHub 형식 · 마지막 일치가 이긴다 · 한 줄에 오너 하나)
function owners() {
  const f = ".github/CODEOWNERS";
  if (!existsSync(f)) return null;
  return readFileSync(f, "utf8").split("\n").map((l) => l.replace(/#.*/, "").trim()).filter(Boolean)
    .map((l) => { const [pat, ...who] = l.split(/\s+/); return { pat, who, re: codeownersRegex(pat) }; });
}
function codeownersRegex(pat) {
  const anchored = pat.startsWith("/");
  const p = pat.replace(/^\//, "");
  const dir = p.endsWith("/");
  const body = p.replace(/\/$/, "").split("/").map((s) =>
    s === "**" ? "\u0000" : s.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")).join("/")
    .replace(/\u0000\//g, "(?:[^/]+/)*").replace(/\/\u0000/g, "(?:/.*)?").replace(/\u0000/g, ".*");
  const head = anchored || p.includes("/") && !p.startsWith("*") ? "^" : "(?:^|/)";
  return new RegExp(`${head}${body}${dir ? "/" : "(?:$|/)"}`);
}
const ownerOf = (path, rules) => {
  let hit = null;
  for (const r of rules ?? []) if (r.re.test(path)) hit = r;
  return hit ? hit.who.join(" ") : "(오너 없음)";
};

const args = process.argv.slice(2);
const rules = owners();

if (args[0] === "--owners") {
  // ── D1: 추적 파일 전부가 정확히 한 오너에 걸리는가
  if (!rules) { console.error(".github/CODEOWNERS 없음"); process.exit(2); }
  for (const r of rules) if (r.who.length !== 1) fail.push(`CODEOWNERS "${r.pat}"에 오너가 ${r.who.length}명 — 한 줄에 한 명`);
  for (const f of git("ls-files")) if (ownerOf(f, rules) === "(오너 없음)") fail.push(`오너 없음: ${f}`);
} else if (args[0] === "--overlap") {
  // ── 아침: 동시에 열린 티켓의 수정 허용이 같은 기존 파일을 노리는가 (담당이 다를 때만)
  const ts = args.slice(1).map(ticket);
  const files = git("ls-files");
  for (const f of files) {
    const who = ts.filter((t) => matches(f, t.allow));
    const owners = new Set(who.map((t) => t.owner));
    if (owners.size > 1) fail.push(`겹침: ${f} ← ${who.map((t) => `${t.id}(${t.owner})`).join(" · ")} — 순서를 정하거나 한쪽을 "요청"으로 바꾼다`);
  }
} else if (/^T-\d+/.test(args[0] ?? "")) {
  // ── PR 전: 이 브랜치의 변경이 티켓 경계 안인가
  const ts = args[0].split(",").map((x) => ticket(x.trim()));
  const t = { file: ts.map((x) => x.file).join(" + "), allow: ts.flatMap((x) => x.allow) };
  const base = args[1] ?? (git("branch", "-a", "--list", "origin/main", "main").length ? "main" : "HEAD~1");
  const mb = execFileSync("git", ["merge-base", base, "HEAD"], { encoding: "utf8" }).trim();
  const changed = git("diff", "--name-only", `${mb}...HEAD`);
  for (const f of changed) {
    if (f.startsWith("tasks/") || f.startsWith("worklog/")) continue;          // 자기 티켓 메모·일지
    if (/\.(patch|orig|rej|diff)$/.test(f)) { fail.push(`부산물 커밋: ${f} — git rm 한다`); continue; }
    if (!matches(f, t.allow)) fail.push(`범위 밖: ${f} — 오너 ${ownerOf(f, rules)}에게 요청 (티켓 ${t.file} 수정 허용 밖)`);
  }
  const live = changed.filter((f) => existsSync(f));
  if (live.length) {
    let marks = [];
    try { marks = git("grep", "-nE", "^(<<<<<<<|>>>>>>>) ", "--", ...live); } catch { /* 무매치면 exit 1 */ }
    for (const m of marks) fail.push(`충돌 표시가 커밋됨: ${m} — 파일 복사로 가져오지 말고 git merge main`);
  }
} else {
  console.error("사용: check-scope.mjs T-### [base] | --overlap T-### T-### … | --owners"); process.exit(2);
}

for (const m of fail) console.log("RED  " + m);
if (fail.length) { console.log(`→ ${fail.length}건. 남의 파일은 고치지 않는다 — 오너에게 요청하거나 티켓을 쪼갠다`); process.exit(1); }
