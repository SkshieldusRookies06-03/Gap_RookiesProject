#!/usr/bin/env node
// check-rubric-p3.mjs — 프로파일 P3 평가표 커버리지 긍정 존재 게이트
// 사용: node scripts/check-rubric-p3.mjs [--human]
//   리포 루트에서 실행. 무출력 + exit 0 이 정상. MISS 줄이 있으면 exit 1.
//   --human : 스크립트가 판정 못 하는 행(캡처·이유·시연)을 목록으로 출력 — D5·D6에 사람이 한 번씩 본다.
// 행 ID·문구의 정본은 references/rubric-p3.md — 표를 고치면 이 파일의 같은 ID도 같은 커밋에서 고친다.
// "있음"만 센다. 맞게 했는지는 rubric-p3.md의 증거 열이 답한다(실패 유형 12번).
// 비밀값·포트·CSP 금지 패턴 같은 "없어야 하는 것"은 check-sec-deploy.mjs가 본다 — 여기서 다시 세지 않는다.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const HUMAN = process.argv.includes('--human');
function sh(c) { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }); } catch { return ''; } }
if (!sh('git rev-parse --is-inside-work-tree').trim()) { console.error('git 리포 루트에서 실행하세요'); process.exit(2); }

const files = sh('git -c core.quotepath=off ls-files').split('\n').filter(f => f && !/node_modules\//.test(f));
const cache = new Map();
const read = f => { if (!cache.has(f)) { try { cache.set(f, readFileSync(f, 'utf8')); } catch { cache.set(f, ''); } } return cache.get(f); };
const sel = re => files.filter(f => re.test(f));
const count = (fl, re) => fl.reduce((n, f) => n + read(f).split('\n').filter(l => re.test(l)).length, 0);
const has = (fl, re, min = 1) => count(fl, re) >= min;

const JAVA = sel(/\.java$/), MAIN = JAVA.filter(f => !/\/test\//.test(f)), TESTJ = JAVA.filter(f => /\/test\//.test(f));
const JS = sel(/\.(jsx?|tsx?)$/), CSS = sel(/\.(css|scss)$/), PY = sel(/\.py$/);
const CFG = sel(/application[^/]*\.(ya?ml|properties)$/), SQL = sel(/db\/migration\/V\d+__.*\.sql$/);
const COMPOSE = sel(/(^|\/)(docker-)?compose[^/]*\.ya?ml$/), DOCKER = sel(/(^|\/)[^/]*Dockerfile[^/]*$/);
const WF = sel(/^\.github\/workflows\/.*\.ya?ml$/), NGINX = sel(/\.conf$/), PKG = sel(/(^|\/)package\.json$/);
const BUILD = sel(/(^|\/)(pom\.xml|build\.gradle(\.kts)?)$/);

const out = []; let miss = 0;
const MISS = (id, what, see) => { miss++; out.push(`MISS   ${id}  ${what}  → ${see}`); };
const need = (cond, id, what, see) => { if (!cond) MISS(id, what, see); };
const SEE = id => `references/rubric-p3.md ${id}`;

// ── BE ─────────────────────────────────────────────────
const ENT = MAIN.filter(f => /@Entity\b/.test(read(f)));
need(ENT.length >= 3, 'R-BE01', `@Entity 클래스 ${ENT.length}개 (≥3)`, SEE('R-BE01'));
for (const f of ENT) need(/@Table\s*\(/.test(read(f)), 'R-BE01', `${f}: @Table(name=…) 없음`, SEE('R-BE01'));
need(has(ENT, /@Column\s*\(/), 'R-BE01', '@Column(…) 사용 0', SEE('R-BE01'));
for (const f of ENT) for (const m of read(f).matchAll(/@(Table|Column|JoinColumn)\s*\([^)]*?\bname\s*=\s*"([^"]+)"/g))
  need(/^[a-z][a-z0-9_]*$/.test(m[2]), 'R-BE02', `${f}: @${m[1]} name="${m[2]}" 가 snake_case 아님`, SEE('R-BE02'));
need(has(ENT, /@ManyToOne/) && has(ENT, /@OneToMany/), 'R-BE03', '@ManyToOne·@OneToMany 둘 다 필요', SEE('R-BE03'));
need(has(ENT, /mappedBy\s*=/), 'R-BE04', '양방향(mappedBy) 1곳 + 선택 이유 열', SEE('R-BE04'));
for (const f of ENT) read(f).split('\n').forEach((l, i, a) => {
  if (/@(ManyToOne|OneToOne)\b/.test(l)) { const blk = a.slice(i, i + 3).join(' '); need(/FetchType\.LAZY/.test(blk), 'R-BE05', `${f}:${i + 1} to-one에 fetch = LAZY 없음`, SEE('R-BE05')); }
});
need(has(ENT, /cascade\s*=/), 'R-BE05', 'cascade 지정 0 (부모-자식 1곳)', SEE('R-BE05'));
need(has(MAIN, /@(NotNull|NotBlank)\b/) && has(MAIN, /@Size\b/) && has(MAIN, /@Pattern\b/), 'R-BE06', '@NotNull/@NotBlank·@Size·@Pattern 각 1회 이상', SEE('R-BE06'));
need(has(MAIN.filter(f => /Controller\.java$/.test(f)), /@Valid\b/), 'R-BE06', '컨트롤러 @Valid 0', SEE('R-BE06'));
need(count(SQL, /\bunique\b/i) >= 2, 'R-BE07', `Flyway SQL의 UNIQUE ${count(SQL, /\bunique\b/i)}개 (≥2)`, SEE('R-BE07'));
need(count(MAIN, /extends\s+JpaRepository\b/) >= 3, 'R-BE08', 'JpaRepository ≥3', SEE('R-BE08'));
const REPO = MAIN.filter(f => /Repository\.java$/.test(f));
need(has(REPO, /@Query\s*\(/) && has(REPO, /\b(find|exists|count|delete)\w*By\w+\s*\(/), 'R-BE09', '메서드 이름 쿼리 1 + @Query 1', SEE('R-BE09'));
need(has(MAIN.filter(f => /Service\w*\.java$/.test(f)), /@Transactional\b/) && has(MAIN, /@Transactional\s*\(\s*readOnly\s*=\s*true/), 'R-BE10', '서비스 @Transactional + readOnly = true 각 1', SEE('R-BE10'));
for (const f of MAIN.filter(f => /(Controller|Repository)\.java$/.test(f))) need(!/@Transactional\b/.test(read(f)), 'R-BE10', `${f}: @Transactional은 서비스 계층에만`, SEE('R-BE10'));
need(has(MAIN, /\b(Pageable|PageRequest)\b/) && has(MAIN, /\bSort\b/), 'R-BE11', 'Pageable/PageRequest + Sort', SEE('R-BE11'));
for (const m of ['Get', 'Post', 'Put', 'Delete']) need(has(MAIN, new RegExp(`@${m}Mapping\\b`)), 'R-BE12', `@${m}Mapping 0`, SEE('R-BE12'));
need(has(MAIN, /\bWebClient\b/), 'R-BE13', 'WebClient(스트림 중계) 0', SEE('R-BE13'));
need(has(MAIN, /(connectTimeout|readTimeout|responseTimeout|CONNECT_TIMEOUT_MILLIS|setReadTimeout|setConnectTimeout|\.timeout\s*\()/), 'R-BE14', 'AI 호출 타임아웃 설정 0', SEE('R-BE14'));
need(has(MAIN, /(onErrorResume|onErrorReturn|catch\s*\(\s*(RestClient\w*|WebClient\w*|Timeout\w*|ResourceAccess\w*)Exception)/) && has(MAIN, /AI_UNAVAILABLE/), 'R-BE14', 'Fallback(onErrorResume/catch) + AI_UNAVAILABLE 코드', SEE('R-BE14'));

// ── FE ─────────────────────────────────────────────────
need(JS.filter(f => /\/components\/[^/]+\.(jsx|tsx)$|\/components\/[^/]+\/[^/]+\.(jsx|tsx)$/.test(f) && !/\.test\./.test(f)).length >= 3, 'R-FE01', 'components/ 공용 컴포넌트 ≥3', SEE('R-FE01'));
need(has(JS, /\.propTypes\s*=/), 'R-FE01', 'PropTypes 0', SEE('R-FE01'));
need(JS.filter(f => /\/hooks\/use[A-Z]\w*\.(jsx?|tsx?)$/.test(f)).length >= 2, 'R-FE02', 'src/hooks/use*.js ≥2 (useChatStream + 1)', SEE('R-FE02'));
need(has(CSS, /@media\b/) || has(JS, /(\b(sm|md|lg|xl):[a-z-]+|useMediaQuery|@media)/), 'R-FE03', '반응형(미디어쿼리·Tailwind 접두어·useMediaQuery) 0', SEE('R-FE03'));
need(files.some(f => /LoadingSpinner\.(jsx|tsx|js)$/.test(f)), 'R-FE04', 'LoadingSpinner 컴포넌트 없음', SEE('R-FE04'));
need(has(PKG, /"zustand"/) && JS.filter(f => /from\s+['"]zustand['"]/.test(read(f))).length >= 2, 'R-FE05', 'zustand 스토어 ≥2', SEE('R-FE05'));
need(has(PKG, /"react-router-dom"/) && has(JS, /(<Route\b|createBrowserRouter)/), 'R-FE06', 'React Router 라우트 정의 0', SEE('R-FE06'));
need(has(JS, /(type=["']file["']|new FormData\b)/), 'R-FE07', '파일 업로드 UI(type="file"/FormData) 0', SEE('R-FE07'));
need(has(JS, /\.getReader\s*\(/), 'R-FE08', '스트림 읽기(getReader) 0', SEE('R-FE08'));

// ── 보안 ───────────────────────────────────────────────
need(MAIN.some(f => read(f).split('\n').some(l => /(\.subject\(|setSubject\()/.test(l) && /uuid/i.test(l))), 'R-SE01', '토큰 subject = uuid 줄 0', SEE('R-SE01'));
need(has(MAIN, /SHA-256/) && has(CFG.concat(MAIN), /access[-_.]?(token[-_.]?)?(expiration|validity|ttl)/i), 'R-SE01', 'Refresh SHA-256 해시 + access 만료 설정', SEE('R-SE01'));
need(has(MAIN, /@PreAuthorize\b/) && has(MAIN, /\/actuator\/\*\*.*ADMIN/), 'R-SE02', '@PreAuthorize + /actuator/** ADMIN', SEE('R-SE02'));
need(has(MAIN.concat(SQL), /(lockedUntil|locked_until)/), 'R-SE03', '로그인 잠금(lockedUntil) 0', SEE('R-SE03'));
for (const f of MAIN) read(f).split('\n').forEach((l, i) => { if (/(createQuery|createNativeQuery|@Query)\s*\(.*"\s*\+\s*\w/.test(l)) MISS('R-SE04', `${f}:${i + 1} 쿼리 문자열 이어붙이기`, SEE('R-SE04')); });
need(has(MAIN, /csrf/i) && has(sel(/^docs\/5-.*\.md$/), /CSRF.*(Authorization|헤더)|((Authorization|헤더).*CSRF)/), 'R-SE05', 'SecurityConfig csrf 설정 + 5번 명세 CSRF 사유 문장', SEE('R-SE05'));
need(has(NGINX, /Content-Security-Policy/) && has(MAIN, /contentSecurityPolicy/), 'R-SE06', 'CSP — nginx(HTML) + SecurityConfig(API) 둘 다', SEE('R-SE06'));
need(has(CFG, /include-stacktrace\s*[:=]\s*never/) && has(MAIN, /@RestControllerAdvice\b/) && has(CFG, /ACTUATOR_EXPOSURE/), 'R-SE08', 'include-stacktrace=never + @RestControllerAdvice + ACTUATOR_EXPOSURE', SEE('R-SE08'));
need(has(MAIN, /AuthenticationSuccessEvent/) && has(MAIN, /AuthenticationFailure\w*Event/), 'R-SE09', '감사 리스너(성공·실패 이벤트)', SEE('R-SE09'));
need(has(MAIN, /AccessDeniedHandler/) && has(MAIN, /AuthenticationEntryPoint/), 'R-SE09', '403 AccessDeniedHandler·401 EntryPoint 로그', SEE('R-SE09'));
need(has(MAIN, /\bmask\w*\s*\(/i), 'R-SE09', '민감정보 마스킹 함수 0', SEE('R-SE09'));
const LEDGER = read('security/LEDGER.md');
const IDS = [...Array(14)].map((_, i) => `B-${i + 1}`).concat([...Array(7)].map((_, i) => `F-${i + 1}`), [...Array(5)].map((_, i) => `A-${i + 1}`), [...Array(5)].map((_, i) => `I-${i + 1}`));
const result = id => { const row = LEDGER.split('\n').find(l => new RegExp(`^\\|\\s*${id}\\s*\\|`).test(l)); return row ? (row.split(/(?<!\\)\|/)[3] || '').trim() : null; };
if (!LEDGER) MISS('R-SE10', 'security/LEDGER.md 없음', SEE('R-SE10'));
else for (const id of IDS) { const r = result(id); need(r !== null, 'R-SE10', `원장에 ${id} 행 없음`, SEE('R-SE10')); if (r !== null) need(/^(발견|미발견|해당 없음|미조치)/.test(r), 'R-SE10', `${id} 결과 칸 "${r}" (발견·미발견·해당 없음·미조치)`, SEE('R-SE10')); }
const SIDS = [...new Set((sh(`git log --format=%s --grep='\\[S-0'`).match(/S-0\d+/g) || []))];
need(SIDS.length >= 3, 'R-SE11', `fix(security) S-ID ${SIDS.length}개 (≥3)`, SEE('R-SE11'));
for (const s of SIDS) need(files.some(f => f.startsWith(`security/evidence/${s}/`)), 'R-SE11', `security/evidence/${s}/ 증거 없음`, SEE('R-SE11'));
need(files.some(f => /^security\/evidence\/.*bom\.json$/.test(f)) && files.some(f => /npm-audit[^/]*\.json$/.test(f)), 'R-SE12', 'security/evidence/bom.json · npm-audit*.json 증거 (target/은 gitignore — 복사해 커밋)', SEE('R-SE12'));
if (LEDGER) for (const id of ['A-2', 'A-3', 'B-10']) { const r = result(id); need(r && !/^해당 없음/.test(r), 'R-SE13', `가산 ${id}는 실제 적용·점검 (해당 없음 불가)`, SEE('R-SE13')); }

// ── AI ─────────────────────────────────────────────────
need(has(PY, /\bStateGraph\b/) && has(PY, /add_conditional_edges/), 'R-AI01', 'LangGraph StateGraph + 조건 분기', SEE('R-AI01'));
need(has(PY, /RecursiveCharacterTextSplitter/) && has(PY, /\b(FAISS|Chroma)\b/) && has(PY, /as_retriever/) && has(PY, /Tavily/i) && has(PY, /owner_uuid/), 'R-AI02', '분할·벡터스토어·retriever·Tavily·owner_uuid 필터', SEE('R-AI02'));
const EV = files.find(f => /(^|\/)eval\/result[^/]*\.(md|json|csv)$/.test(f));
need(EV && /LLM/.test(read(EV)) && /RAG/.test(read(EV)) && /Tavily/i.test(read(EV)), 'R-AI03', '골든셋 결과(LLM 단독 / +RAG / +RAG+Tavily 세 조건)', SEE('R-AI03'));
need(has(PY, /(StreamingResponse|EventSourceResponse)/) && has(PY, /text\/event-stream/) && has(PY, /x-internal-token/i) && has(PY, /["']\/health["']/), 'R-AI04', 'SSE StreamingResponse · 내부 토큰 · /health', SEE('R-AI04'));

// ── 배포 ───────────────────────────────────────────────
const dirs = new Set(DOCKER.map(f => f.split('/').slice(0, -1).join('/') || '.'));
need(dirs.size >= 3, 'R-DP01', `Dockerfile ${dirs.size}곳 (backend·frontend·ai ≥3)`, SEE('R-DP01'));
need(has(COMPOSE, /image:\s*["']?(mariadb|mysql|postgres)/), 'R-DP01', 'compose에 DB 서비스 없음', SEE('R-DP01'));
need(count(COMPOSE, /^\s+-\s+["']?[a-z][\w-]*:\//) >= 2, 'R-DP01', 'named volume 마운트 ≥2 (DB · 벡터 인덱스)', SEE('R-DP01'));
const multi = DOCKER.filter(f => (read(f).match(/^\s*FROM\s/gim) || []).length >= 2).length;
need(multi >= 2, 'R-DP02', `멀티스테이지 Dockerfile ${multi}개 (backend·frontend ≥2)`, SEE('R-DP02'));
need(DOCKER.filter(f => /^\s*HEALTHCHECK\s/im.test(read(f))).length >= 2, 'R-DP02', 'HEALTHCHECK Dockerfile ≥2 (backend·ai)', SEE('R-DP02'));
for (const f of DOCKER) { const froms = [...read(f).matchAll(/^\s*FROM\s+(\S+)/gim)].map(m => m[1]); const last = froms[froms.length - 1] || ''; need(/(slim|alpine|jre|distroless)/.test(last), 'R-DP02', `${f}: 실행 이미지 '${last}' 경량 아님`, SEE('R-DP02')); }
need(has(COMPOSE, /^networks:/) && has(COMPOSE, /internal:\s*true/), 'R-DP02', 'compose 최상위 networks + internal: true 내부망', SEE('R-DP02'));
need(has(COMPOSE, /^volumes:/) && has(COMPOSE, /(env_file:|\$\{)/) && has(COMPOSE, /condition:\s*service_healthy/), 'R-DP02', 'volumes · env_file/${} · depends_on condition: service_healthy', SEE('R-DP02'));
need(has(BUILD, /flyway-(mysql|database-mysql)/i) && SQL.some(f => /V1__/.test(f)) && has(CFG, /ddl-auto\s*[:=]\s*validate/), 'R-DP03', 'flyway-mysql 의존성(MariaDB) + V1__*.sql + ddl-auto validate', SEE('R-DP03'));
need(count(WF, /docker\/build-push-action/) >= 3 && has(WF, /docker\/login-action/) && has(WF, /github\.sha/), 'R-DP04', 'build-push ×3 · login-action · github.sha 태그', SEE('R-DP04'));

// ── 개별 · 제출 ─────────────────────────────────────────
const subj = sh('git log --no-merges --format=%s').split('\n').filter(Boolean);
const ok = subj.filter(s => /^(feat|fix|docs|test|refactor|chore|ci|build|style|perf)(\([^)]+\))?!?: \S/.test(s) && /\[T-\d+\]/.test(s)).length;
need(!subj.length || ok / subj.length >= 0.9, 'R-IN02', `커밋 메시지 규칙(type: … [T-###]) 준수 ${ok}/${subj.length} (≥90%)`, SEE('R-IN02'));
need(TESTJ.some(f => /(isForbidden|FORBIDDEN|\b403\b)/.test(read(f))), 'R-IN03', 'BE IDOR 403 회귀 테스트 0', SEE('R-IN03'));
need(JS.some(f => /\.test\.(jsx?|tsx?)$/.test(f)), 'R-IN03', 'FE 테스트 파일 0', SEE('R-IN03'));
need(PY.some(f => /(^|\/)test_[^/]+\.py$/.test(f)), 'R-IN03', 'AI pytest 0', SEE('R-IN03'));
need(/docker compose/.test(read('README.md')) && /\.env\.example/.test(read('README.md')), 'R-SB01', 'README 실행 절차(.env.example → docker compose up)', SEE('R-SB01'));
need(files.includes('.env.example'), 'R-SB02', '.env.example 없음', SEE('R-SB02'));

for (const l of out) console.log(l);

if (HUMAN) {
  console.log('\n# 사람 판정 (rubric-p3.md 증거 열을 눈으로 확인 · 확인한 행은 docs/9 또는 해당 문서에 캡처가 있어야 한다)');
  for (const l of [
    'R-BE04 양방향 선택 이유 열(5번 §4.1.1)', 'R-BE14 AI 중지 상태 호출 → 503 봉투 캡처', 'R-FE01 공용 컴포넌트가 두 화면 이상에서 쓰임',
    'R-FE03 뷰포트 390·768·1280 캡처 3장', 'R-FE07 업로드→채팅 시연 경로', 'R-SE02 IDOR 재현·재확인 · USER 토큰 /actuator/metrics 403',
    'R-SE03 Burp Intruder 잠금 캡처', 'R-SE06 curl -I CSP 헤더 캡처 · XSS 재현', 'R-SE08 500 응답에 스택 없음 캡처', 'R-SE09 감사 로그 4줄 캡처(마스킹 보임)',
    'R-SE13 Prompt Injection 재현 1건', 'R-DC01~05 문서 9종 내용', 'R-AI03 세 조건 수치가 발표 수치 1장과 같음',
    'R-DP05 EC2 URL 접속 · 외부 8080/8000/3306 실패 캡처', 'R-DP06 (가산) CD 실행 캡처', 'R-DP07 (가산) kubectl get all 캡처', 'R-IN04 주석·자기 문서 절 커밋', 'R-IN06 코드 복잡도 — 200줄 넘는 클래스·50줄 넘는 메서드가 있으면 쪼갰거나 이유가 있는가',
  ]) console.log(`[사람] ${l}`);
  console.log('\n# R-IN01 커밋 분포 (전원 매일 1커밋 이상인지 눈으로)');
  process.stdout.write(sh('git shortlog -sn --no-merges --all'));
}
process.exit(miss ? 1 : 0);
