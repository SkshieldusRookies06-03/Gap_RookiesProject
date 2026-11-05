#!/usr/bin/env node
// seams/check-scope.mjs — 역할·티켓 경계 검사 (spec-bootcamp-web §역할·티켓 분해)
//
//   node seams/check-scope.mjs T-009 [base]      PR 전: 이 브랜치가 티켓의 "수정 허용" 밖을 건드렸나
//   node seams/check-scope.mjs T-016,T-017       커밋이 티켓 둘에 걸치면 쉼표로 (허용 범위 합집합)
//   node seams/check-scope.mjs --overlap T-006 T-009 T-019
//                                               D1·아침: 동시에 열린 티켓들이 같은 파일을 노리나
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

const args = process.argv.slice(2);

if (args[0] === "--overlap") {
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
  const base = args[1] ?? (git("branch", "-a", "--list", "origin/dev", "dev").length ? "origin/dev" : "HEAD~1");
  const mb = execFileSync("git", ["merge-base", base, "HEAD"], { encoding: "utf8" }).trim();
  const changed = git("diff", "--name-only", `${mb}...HEAD`);
  for (const f of changed) {
    if (f.startsWith("tasks/") || f.startsWith("worklog/")) continue;          // 자기 티켓 메모·일지
    if (/\.(patch|orig|rej|diff)$/.test(f)) { fail.push(`부산물 커밋: ${f} — git rm 한다`); continue; }
    if (!matches(f, t.allow)) fail.push(`범위 밖: ${f} — 담당자와 협의 (티켓 ${t.file} 수정 허용 밖)`);
  }
  const live = changed.filter((f) => existsSync(f));
  if (live.length) {
    let marks = [];
    try { marks = git("grep", "-nE", "^(<<<<<<<|>>>>>>>) ", "--", ...live); } catch { /* 무매치면 exit 1 */ }
    for (const m of marks) fail.push(`충돌 표시가 커밋됨: ${m} — 임의로 덮어쓰지 말고 dev와 비교해 충돌 해결`);
  }
} else {
  console.error("사용: check-scope.mjs T-### [base] | --overlap T-### T-### …"); process.exit(2);
}

for (const m of fail) console.log("RED  " + m);
if (fail.length) { console.log(`→ ${fail.length}건. 다른 담당의 파일은 합의 후 수정하거나 티켓을 쪼갠다`); process.exit(1); }
