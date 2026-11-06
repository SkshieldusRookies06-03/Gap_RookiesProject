# 레인 명세 — FE-분석 (분석 화면 · 스트리밍 · 후속 질문 · 보안 점검 몫)

> 정본은 `SPEC.md` §4.3(스트림·이벤트) · §5(화면) · §7(보안) · §8(레인). 이 문서는 "어떻게"까지 내려간 실행 명세다 — SPEC과 다르면 SPEC이 이긴다.
> 범위(수정 허용)·수용 기준·확인 명령의 정본은 티켓 파일 `tasks/T-010·T-022·T-062·T-030·T-039·T-063·T-043-*.md` · 일정: `tasks/BOARD.md`.
> **보안 분담**: S-01 재현 · F-1~F-7 · B-1·B-8·B-10·B-11 점검·기록(`security/rows/FA.md`)은 내 몫(§9). 원장·9번 취합은 기술 리드. 응답 렌더 컴포넌트(`ReportText`·`SourceChips`)는 기술 리드 몫(T-054 완성본) — 나는 import해서 쓴다.

**내 브랜치·흐름** — 브랜치 `feature/frontend`(FE-화면과 같이 쓴다 · 티켓마다 새 브랜치를 만들지 않는다 · 필수 리뷰·승인·CODEOWNERS 없음 — `onboarding/GitHub규약.md`). `security/rows/FA.md`·증거도 이 브랜치로 올린다(README — 브랜치는 영역).
작업 전 `git pull origin feature/frontend` → 커밋 → push 전 `node seams/check-scope.mjs <내 티켓> origin/feature/frontend` 무출력 ·
`git diff --stat origin/feature/frontend...HEAD`로 본 코드(`frontend/src` 비테스트) 150줄 이하 확인 → push → PR `feature/frontend → dev`(dev 검증 뒤 `dev → main`).

**공용 파일 경계 (FE-화면·FE-분석 두 문서에 같은 문장)** — `frontend/src/api/`·`components/`·`stores/authStore.js`·`styles/`·`routes.js`·`App.jsx`는 **FE-화면 파일**이다.
고치는 티켓은 FE-화면의 T-009(`api/`·`components/`·`styles/`·`routes.js`·`App.jsx`)와 T-059(`components/`·`pages/*.jsx`)뿐이고(`stores/authStore.js`는 지금 어느 티켓의 수정 허용에도 없다 — 바꿀 일이 생기면 FE-화면 티켓부터), FE-분석은 읽기만 하며 필요한 변경(문구 추가 등)은 FE-화면에게 요청한다.
`hooks/useChatStream.js`·`stores/chatStore.js`·`pages/analysis/AnalysisPage*`는 FE-분석 파일, `pages/analysis/ReportText*`·`SourceChips*`는 기술 리드 파일(T-054)이다.
판정·회귀 테스트(`src/api/*.test.js`·`components/ErrorMessage.test.jsx`·`pages/DocumentsPage.test.jsx`·`hooks/useChatStream.test.jsx`·`pages/analysis/ReportText.test.jsx`)는 둘 다 고치지 않는다.
교차 의존 하나: `components/Layout.jsx`가 로그아웃 때 `useChatStore.getState().reset()`을 부른다 — FE-분석은 `reset`을 지우거나 이름을 바꾸지 않는다.

## 0. 판정 테스트

| 파일 | 무엇을 보나 | 티켓 | D1 상태 |
|---|---|---|---|
| `frontend/src/hooks/useChatStream.test.jsx` ① | 새 분석: 요청 본문이 **정확히** `{postingId, resumeId}` · `analysisId === '7'` · 마지막 메시지 `role 'ASSISTANT'`, content = 토큰을 디코드해 이은 원문(줄바꿈 포함) · `sources` 타입 `['doc','web']` · `error === null` · 끝나면 `streaming === false` | T-022 | **red** |
| ② | 후속 질문: 본문 `{analysisId, question}` · messages 역할이 정확히 `['USER','ASSISTANT']` · `messages[0].content === question` | T-022 | **red** |
| ③ | `event: error` → `error.code === 'AI_UNAVAILABLE'` · `streaming === false` | T-022 | **red** |
| ④ | 시작 전 403 JSON 봉투 → `error.code === 'FORBIDDEN'` · `streaming === false` | T-022 | **red** |
| `frontend/src/pages/analysis/ReportText.test.jsx` (4) | `ReportText`(prop `text`) 제목·표·목록 요소 · HTML은 글자로(F-1) · 덜 온 마크다운도 글자 보존 · `SourceChips`(prop `sources`) doc/web 구분 · 웹은 http(s)만 새 탭 링크(`noopener noreferrer`) | T-054(기술 리드) — 나는 import만 | red → T-054가 green |
| `frontend/src/pages/analysis/AnalysisPage.test.jsx` | 만들 것(내 테스트) — 재진입 시 지난 대화가 보인다 1 | T-030 | 없음 |

테스트가 보는 계약: `const { messages, streaming, error, analysisId, start, stop } = useChatStream()` ·
`start(...)`는 **스트림이 끝날 때까지 기다리는 Promise**를 돌려준다(테스트가 `await result.current.start(...)` 한다).
판정 테스트 파일은 고치지 않는다 — 틀려 보이면 기술 리드에게. 반환값을 더 늘리는 것(`hydrate`·`reset`)은 괜찮다.
**CI 1단계(필수)** = `npm run build && npx vitest run src/api src/components`(FE-화면 공용 · `.github/workflows/ci.yml`) — 내 테스트는 2단계(`npm test` · D5까지 red 허용 · D5 저녁 필수 전환 T-049). 빌드가 깨지면 1단계가 red다.

## 1. 완료 정의 (D5 저녁)

- [ ] `npx vitest run src/hooks` green(판정 4 + FE-화면 `useUpload.test.js`) · `npx vitest run src/pages/analysis` green · `npm run build` 성공
- [ ] 목 서버와 compose(nginx 경유) 둘 다에서: 공고·이력서 선택 → 리포트가 **시간 간격을 두고** 흘러나옴 → 출처 칩 → 후속 질문 → 기록에서 재진입하면 지난 대화가 보임(`seams/smoke.md` 5·6·9번 줄)
- [ ] 생성 중 표시 + 중단 버튼 · 중단하면 부분 답변은 화면에 남고 "중단됨" 표시
- [ ] 에러 4종(403·404·400 타입 불일치·스트림 error)이 사용자 문구로 보인다(`messageFor`)
- [ ] AI 응답은 `ReportText`, 출처는 `SourceChips`, 질문은 JSX 텍스트(HTML 주입 0 · `check-sec-deploy` 무출력)
- [ ] 분석 화면 390·768·1280 캡처 3장(R-FE03) · 6번 문서 내 절 TODO 0(T-043)
- [ ] `security/rows/FA.md` S-01 · F-1~F-7 · B-1·B-8·B-10·B-11 전부 채움 + 증거 파일(T-062·T-039·T-063)

## 2. 만들/고칠 파일 (티켓의 수정 허용 그대로)

| 경로 | 역할 | 티켓 |
|---|---|---|
| `docs/wire/analysis.png` | 종이 와이어 사진 | T-010 |
| `frontend/src/hooks/useChatStream.js` | 스트림 훅(판정 대상 · 골격 있음) | T-022 · T-030 |
| `frontend/src/stores/chatStore.js` | 있음 — 분석 화면 상태(`reset`은 `Layout`이 부른다 — 유지) | T-022 · T-030 |
| `frontend/src/pages/analysis/AnalysisPage.jsx` | 화면 루트(라우트 `/analyses/new` · `/analyses/:id` · 골격 있음). **`DocumentPicker`·`MessageList`·`FollowUpForm`은 이 파일 안 함수 컴포넌트로** — 별도 파일은 어느 티켓의 수정 허용에도 없다 | T-022 · T-030 · T-039 |
| `frontend/src/pages/analysis/Analysis.module.css` | 레이아웃 + **반응형(`@media` 768·1280)** — T-022에만 수정 허용이 있으니 반응형까지 T-022에서 끝낸다 | T-022 |
| `frontend/src/pages/analysis/AnalysisPage.test.jsx` | 내 테스트(새로 만듦) | T-030 |
| `security/evidence/S-01/` | S-01 재현·재확인 증거 | T-062 |
| `security/evidence/F-*` · `security/evidence/npm-audit.json` | 프론트 점검 증거 | T-039 |
| `security/evidence/B-1.txt` · `B-8.txt` · `B-10.txt` · `B-11.txt` | 백엔드 점검 증거 | T-063 |
| `security/rows/FA.md` | 점검 기록(원장으로 옮기는 원본) | T-062 · T-039 · T-063 |
| `docs/6-*` · `docs/img/` | 6번 문서 내 절 · 반응형 캡처 | T-043 |

읽기만 하는 것(위 공용 파일 경계): `api/client.js`(`streamPost`·`api`·`ApiError`) · `api/sse.js`(`createSseParser`·`decodeData`) ·
`components/`(`LoadingSpinner`·`EmptyState`·`ErrorMessage`·`messageFor`·`Button`) · `routes.js`(`ROUTES`) · `styles/tokens.css` ·
`pages/analysis/ReportText.jsx`·`SourceChips.jsx`(기술 리드 T-054).

## 3. 티켓별 구현 명세

### T-010 분석 화면 와이어(종이 1장)를 SPEC §4.3과 대조하고, 목 스트림을 직접 읽어 본다 (D1 · 선행 T-009)

- **수정 허용**: `docs/wire/`
- **수용 기준 요지**: `docs/wire/analysis.png` + 대조 결과 한 줄 · `node mock/server.mjs` 스트림을 브라우저 콘솔에서 토큰 단위로 확인(임시 코드는 커밋 안 함) · `check-sec-deploy` · `check-scope T-010` 무출력
- **확인 명령**:
  ```bash
  (사진·콘솔 캡처를 PR 설명에)
  ```
- **구현 지침**:
  1. 종이 와이어 1장: 선택 영역 · 대화 영역 · 생성 중/중단 · 출처 칩 · 후속 입력창. 화면의 데이터 요소마다 SPEC §4.3 필드 이름을 옆에 적는다
     (예: 칩 = `sources[].type`·`docType`·`chunk`·`url`·`title`) — 계약에 없는 요소가 있으면 기술 리드에게. 사진을 `docs/wire/analysis.png`로, 대조 결과 한 줄을 PR 설명에.
  2. 목으로 스트림을 눈으로: `node mock/server.mjs` + `cd frontend && npm run dev` → 로그인(kim@example.com / Passw0rd!) 후 `AnalysisPage.jsx`에 임시 `useEffect`로
     `streamPost('/api/analyses/stream', {postingId:'12', resumeId:'15'})` → `getReader()`로 읽어 `console.log`. 토큰이 약 0.15초 간격으로 찍히면 정상. **임시 코드는 커밋하지 않는다**(`AnalysisPage.jsx`는 T-010 수정 허용 밖).
  3. 커밋: `docs(fe): 분석 화면 와이어 [T-010]`

### T-022 useChatStream과 분석 화면 기본(선택 → 스트리밍 → 중단) (D2 · 선행 T-010 · T-054) — 판정 테스트 4

- **수정 허용**: `frontend/src/hooks/useChatStream.js` · `frontend/src/stores/chatStore.js` · `frontend/src/pages/analysis/AnalysisPage.jsx` · `frontend/src/pages/analysis/Analysis.module.css`
- **수용 기준 요지**: `src/hooks/useChatStream.test.jsx` 4 green · `ReportText`·`SourceChips`를 import해서 렌더(고치지 않음) · `seams/smoke.md` 5번 줄 · `check-sec-deploy` · `check-scope T-022` 무출력
- **확인 명령**:
  ```bash
  cd frontend && npx vitest run src/hooks
  ```
- **선행 T-054**: `ReportText`·`SourceChips`는 기술 리드 브랜치(`feature/security`)에서 `dev`로 들어온다. 내 브랜치에 아직 없으면 선행 미충족 — 기술 리드에게 머지 시점을 묻는다(그동안 훅·판정 4는 먼저 할 수 있다).
- **구현 지침** (SPEC §4.3 · §5):

이벤트 → 상태 (SPEC §4.3 순서: `analysis`(새 분석만) → `token`… → `sources` → `done` / 장애면 `error`로 끝)

| 이벤트 | data | 상태 변화 |
|---|---|---|
| (start 호출) | — | 후속이면 `{role:'USER', content: question, sources:[]}` 추가 → 빈 `{role:'ASSISTANT', content:'', sources:[]}` 추가 · `streaming=true` · `error=null` |
| `analysis` | `{"analysisId":"7"}` | `analysisId` 설정 |
| `token` | JSON 문자열 | `decodeData(d)`를 마지막 ASSISTANT `content`에 이어 붙임 |
| `sources` | 배열 JSON | 마지막 ASSISTANT `sources` = `JSON.parse(d)` |
| `done` | `{"messageId":"31"}` | (스트림 끝 — 루프가 종료된다) |
| `error` | 에러 봉투 JSON | `error = JSON.parse(d)` (→ `error.code`) |
| 시작 전 403/404/400 | `streamPost`가 `ApiError` throw | `error = e` · ASSISTANT 빈 말풍선 제거 |
| 중단 | `fetch` 전이면 `streamPost`가 `ApiError` **`code: 'ABORTED'`**, 읽는 중이면 `reader.read()`가 `AbortError` | 에러로 보지 않는다 · 마지막 ASSISTANT에 `stopped: true` |
| 401 | `streamPost`가 refresh 1회 재시도 · 실패면 세션을 비운다(FE-화면 `client.js`) | `error = e` — `Protected`가 `/login`으로 보낸다 |

getReader 루프 · 이벤트별 갱신 · 중단 (핵심 조각 — 나머지 상태 선언은 직접)
```js
const ctrl = useRef(null);
const patchLast = (fn) => setMessages((m) => [...m.slice(0, -1), fn(m[m.length - 1])]);
const isAbort = (e) => e?.name === 'AbortError' || e?.code === 'ABORTED';

const start = useCallback(async (req) => {          // req = {postingId, resumeId} | {analysisId, question}
  setError(null);
  setMessages((m) => [...m, ...(req.question ? [{ role: 'USER', content: req.question, sources: [] }] : []),
                         { role: 'ASSISTANT', content: '', sources: [] }]);
  ctrl.current = new AbortController();
  setStreaming(true);
  try {
    const res = await streamPost('/api/analyses/stream', req, ctrl.current.signal);   // 본문은 req 그대로(키를 더하지 않는다 — 판정 ①②)
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    const parser = createSseParser((event, data) => {
      if (event === 'analysis') setAnalysisId(JSON.parse(data).analysisId);
      else if (event === 'token') patchLast((x) => ({ ...x, content: x.content + decodeData(data) }));
      else if (event === 'sources') patchLast((x) => ({ ...x, sources: JSON.parse(data) }));
      else if (event === 'error') setError(JSON.parse(data));
    });
    for (;;) { const { done, value } = await reader.read(); if (done) break; parser.feed(dec.decode(value, { stream: true })); }
  } catch (e) {
    if (isAbort(e)) patchLast((x) => ({ ...x, stopped: true }));
    else { setError(e); setMessages((m) => (m.at(-1)?.content === '' ? m.slice(0, -1) : m)); }
  } finally { setStreaming(false); }
}, []);
const stop = useCallback(() => ctrl.current?.abort(), []);
```
주의: 언마운트 시 `useEffect(() => () => ctrl.current?.abort(), [])`. SSE 조각 경계(CR·CRLF가 조각 끝에서 갈려도)는 `createSseParser`가 처리한다 — 직접 자르지 않는다.

기록 재진입·새 분석 화면용 — SPEC §5의 반환 7개(`messages·streaming·error·analysisId·start·stop·hydrate`)는 그대로 지키고, **하위 호환 확장** 둘만 더한다: `hydrate`의 두 번째 인자(분석 id) · `reset`. 6번 §5.3에는 "SPEC §5 + 확장"으로 표시한다(테스트는 7개만 본다).
```js
// SPEC §5 hydrate(messages) — 두 번째 인자로 분석 id를 받아 후속 질문·로드 가드에 쓴다
const hydrate = useCallback((list, id) => {
  if (id) setAnalysisId(id);
  setMessages(list.map(({ role, content, sources }) => ({ role, content, sources: sources ?? [] })));
}, []);
const reset = useCallback(() => { ctrl.current?.abort(); setMessages([]); setAnalysisId(null); setError(null); }, []);
return { messages, streaming, error, analysisId, start, stop, hydrate, reset };
```

컴포넌트 트리 · props (전부 `AnalysisPage.jsx` 한 파일 안 · 모든 컴포넌트에 `PropTypes` — SPEC §5)
```
AnalysisPage                         (useParams().id · useNavigate · useChatStream)
 ├ DocumentPicker   (id 없을 때만)    props: { onStart: ({postingId, resumeId}) => void, disabled: bool }
 ├ MessageList                       props: { messages: [{role, content, sources, stopped?}] }
 │   ├ USER: {m.content} 텍스트 · white-space: pre-wrap
 │   ├ ASSISTANT: <ReportText text={m.content} /> · stopped면 "중단됨"
 │   └ ASSISTANT: <SourceChips sources={m.sources} />
 ├ streaming ? <LoadingSpinner label="생성 중…" /> + <Button variant="secondary" onClick={stop}>중단</Button> : null
 ├ error ? <ErrorMessage error={error} onRetry={retry} /> : null
 └ FollowUpForm     (analysisId 있고 !streaming)  props: { onSubmit: (question) => void, disabled: bool }
```
`ReportText`·`SourceChips`는 기술 리드 완성본을 import만 한다(prop 이름은 판정 테스트 `ReportText.test.jsx` 그대로 — `text`·`sources`):
```jsx
import ReportText from './ReportText.jsx';      // 제목·표·목록만 요소로, HTML은 글자로 — F-1 방어선
import SourceChips from './SourceChips.jsx';    // doc/web 구분 · 웹 링크는 http(s)만 · target=_blank · rel="noopener noreferrer"
```
웹 출처를 직접 `<a>`로 그리지 않는다 — 스킴 검사는 `SourceChips` 안에 있다. 필요한 게 있으면 기술 리드에게.

DocumentPicker — 쓰는 API (FE-화면의 `api.get`)

| 호출 | 응답 필드 | 화면 |
|---|---|---|
| `GET /api/documents?type=JOB_POSTING&page=0&size=50&sort=createdAt,desc` | `content[]: {id, type, title, charCount, createdAt}` | 공고 `<select>` (option 텍스트 = `{title}`) |
| `GET /api/documents?type=RESUME&page=0&size=50&sort=createdAt,desc` | 같음 | 이력서 `<select>` |

| 상태 | 렌더 |
|---|---|
| 로딩 | `LoadingSpinner` |
| 빈(둘 중 하나라도 0개) | `EmptyState message="공고 1개와 이력서 1개를 고르세요" action={<Link to={ROUTES.DOCUMENTS}>문서 올리러 가기</Link>}` |
| 에러 | `ErrorMessage onRetry` |
| 정상 | select 둘 + "분석 시작"(둘 다 고르기 전 `disabled`) |

선택값은 Picker 지역 state로 충분하다. `chatStore.js`는 R-FE05 증거(Zustand 스토어 2개)라 지우지 않는다 — "마지막으로 고른 공고·이력서" 기억에 쓰면 된다
(필드 추가는 내 파일이라 자유 · 단 `reset`은 그 필드까지 비우게 — 로그아웃 뒤 다른 계정에 남지 않게).

사용자 동작 흐름

| 동작 | 호출 | 결과 | 실패 문구(`messageFor`) |
|---|---|---|---|
| 분석 시작 | `start({postingId, resumeId})` | 리포트 스트리밍 · `analysis` 이벤트로 id 받음 | 403 "접근 권한이 없습니다" · 404 "문서를 찾을 수 없습니다" · `DOCUMENT_TYPE_MISMATCH` "공고와 이력서를 각각 골라 주세요" · `AI_UNAVAILABLE` "분석 서버가 응답하지 않습니다" + 재시도 |
| 중단 | `stop()` | 부분 답변 + "중단됨" · 서버에는 답변이 저장되지 않는다(SPEC §4.3) | — |
| 후속 질문 | `start({analysisId, question})` | USER + ASSISTANT 추가 | 빈 질문은 버튼 `disabled`(서버 400 왕복 줄이기) · 1000자 `maxLength` |
| 재시도 | 마지막 요청 그대로 `start`(페이지에 `useRef`로 보관) | 실패한 빈 말풍선은 이미 제거됨 | — |

위 문구는 전부 `ErrorMessage`의 `BY_CODE`에 이미 있다. 빠진 코드를 찾으면 FE-화면에게 요청(T-059 · 내가 고치지 않는다).

URL 교체 — SPEC §5: 새 분석에서 `analysis` 이벤트를 받으면 `navigate(ROUTES.analysis(id), { replace: true })`로 **URL만** 바꾸고, 스트리밍 중에는 messages를 다시 불러오지 않는다.
```js
const { id } = useParams();
const navigate = useNavigate();
const { messages, streaming, error, analysisId, start, stop, hydrate, reset } = useChatStream();

useEffect(() => {                                    // /analyses/new 에서 시작한 스트림이 analysis 이벤트를 받은 순간
  if (!id && streaming && analysisId) navigate(ROUTES.analysis(analysisId), { replace: true });
}, [id, streaming, analysisId, navigate]);
useEffect(() => { if (!id) reset(); }, [id, reset]);  // 내비 "새 분석"으로 돌아오면 이전 대화를 비운다
```
`/analyses/new`와 `/analyses/:id`는 같은 `AnalysisPage`라 URL만 바뀌고 컴포넌트·훅 상태는 그대로다 — 그래서 T-030 로드 효과에 가드가 필요하다.

반응형 (`Analysis.module.css` · 브레이크포인트 768·1280 — `styles/tokens.css` 주석의 값 · T-022 커밋에 포함)

| 폭 | 바뀌는 것 |
|---|---|
| < 768 (390 캡처) | Picker의 select 둘이 세로로 · 말풍선 폭 100% · 칩 줄바꿈 · FollowUpForm 화면 아래 붙음(`position: sticky; bottom: 0`) · 중단 버튼은 입력창 자리 · 리포트 표는 가로 넘치면 표 칸 안에서만 스크롤 |
| 768~1279 | select 둘 가로 한 줄 + 시작 버튼 · 말풍선 최대 폭 80% |
| ≥ 1280 | 대화 열 최대 폭을 고정하고 가운데 정렬(여백만 커짐) |

색·간격은 `var(--color-*)`·`var(--space-*)`만 · `@media (min-width: 768px)` · `@media (min-width: 1280px)` 두 줄은 반드시(R-FE03 게이트가 `@media`를 센다).
확인: `npx vitest run src/hooks` · 목 서버로 클릭 경로(smoke 5번).
커밋: `feat(fe): useChatStream·분석 화면 [T-022]`

### T-062 S-01 IDOR 재현 (D3 · 선행 T-014(머지·소유 검증 없음) · T-015)

- **수정 허용**: `security/evidence/S-01/` · `security/rows/FA.md`
- **수용 기준 요지**: 조치 전 `before.json` · `before-commit.txt`(해시) · `burp-before.png`(Repeater) · 조치 후(T-026 뒤) `after.json`(403 봉투) · `burp-after.png` · 감사 로그 한 줄 `audit.log` · `security/rows/FA.md` S-01 절 · 재현 끝나면 채널에 "S-01 재현 완료" → BE-기능이 T-026 머지 · `check-sec-deploy` · `check-scope T-062` 무출력
- **확인 명령**:
  ```bash
  curl -s localhost:8080/api/documents/3 -H "Authorization: Bearer $T"
  ```
- **구현 지침**: §9.1 명령 그대로. **T-026 머지 전에** 한다 — T-026의 선행에 이 티켓이 있다.
- 커밋: `docs(security): S-01 재현 증거 [T-062]`

### T-030 후속 질문·기록 재진입(hydrate)·분석 화면 상태 테스트 (D3 · 선행 T-022)

- **수정 허용**: `frontend/src/pages/analysis/AnalysisPage.jsx` · `frontend/src/pages/analysis/AnalysisPage.test.jsx` · `frontend/src/hooks/useChatStream.js` · `frontend/src/stores/chatStore.js`
- **수용 기준 요지**: `/analyses/:id` 진입 시 messages → hydrate · 스트리밍 중 재로딩 금지 · `pages/analysis/AnalysisPage.test.jsx` 1(내 테스트) · `seams/smoke.md` 6번 줄 · `check-sec-deploy` · `check-scope T-030` 무출력
- **확인 명령**:
  ```bash
  cd frontend && npm test
  ```
- **구현 지침** (SPEC §4.3 messages · §5):

`/analyses/:id` 진입 시 지난 대화 로드 후 이어 쓰기
```js
const [loadState, setLoadState] = useState({ loading: false, error: null });
useEffect(() => {
  if (!id || streaming || id === analysisId) return;  // 스트리밍 중 재로딩 금지(SPEC §5) · 방금 만든·이미 불러온 분석이면 건너뜀
  let alive = true;
  setLoadState({ loading: true, error: null });
  api.get(`/api/analyses/${id}/messages?page=0&size=50`)
    .then((d) => { if (alive) { hydrate(d.content, id); setLoadState({ loading: false, error: null }); } })
    .catch((e) => alive && setLoadState({ loading: false, error: e }));   // 남의 분석 403 · 없음 404
  return () => { alive = false; };
}, [id, streaming, analysisId, hydrate]);
```
응답 `content[]: {id, role, content, sources, createdAt}`(오래된 순). 마지막이 USER면 그 질문은 중단·실패된 것(SPEC §2 — ASSISTANT는 완주했을 때만 저장) — 말풍선 아래 "답변 없음(중단됨)"으로 보인다(목의 분석 `7`이 이 모양).
한 분석의 메시지가 50개를 넘는 경우는 범위 밖(첫 페이지만).

| 상태(재진입) | 렌더 |
|---|---|
| 로딩 | `LoadingSpinner` |
| 빈 | 해당 없음(분석에는 최소 질문 1개) |
| 에러 | `ErrorMessage` (403·404) + `Link to={ROUTES.ANALYSES}` "기록으로" |
| 정상 | `MessageList` + `FollowUpForm` |

후속 질문: `FollowUpForm` → `start({ analysisId, question })` — `analysisId`는 hydrate가 넣은 값. 기록 재진입으로 들어온 분석에는 `analysis` 이벤트가 오지 않는다(SPEC §4.3 — 새 분석일 때만).
`AnalysisPage.test.jsx`(내 테스트): `<MemoryRouter initialEntries={['/analyses/7']}>` + `<Routes><Route path={ROUTES.ANALYSIS} …/></Routes>` · MSW로 `GET /api/analyses/7/messages` → 지난 대화 텍스트가 보인다 1.
커밋: `feat(fe): 후속 질문·기록 재진입 [T-030]`

### T-039 스트림 error UI + 프론트 보안 점검 F-1~F-7(증거·기록) (D4 · 선행 T-022 · T-054)

- **수정 허용**: `frontend/src/pages/analysis/AnalysisPage.jsx` · `security/evidence/F-*` · `security/evidence/npm-audit.json` · `security/rows/FA.md`
- **수용 기준 요지**: error 이벤트 → `messageFor(error)` + 재시도 · F-1~F-7 증거 `security/evidence/F-*` · 결과·방법은 `security/rows/FA.md`(원장은 기술 리드가 합친다 — `security/LEDGER.md`·9번은 직접 고치지 않는다) · `check-sec-deploy` · `check-scope T-039` 무출력
- **확인 명령**:
  ```bash
  cd frontend && npm test
  ```
- **구현 지침**:
  - 스트림 `error` 이벤트 UI: `<ErrorMessage error={error} onRetry={retry} />`(문구는 `messageFor`). 재현 — 목은 `?fail=1` 쿼리가 있을 때만 `event: error`를 낸다(임시로 경로에 붙여 확인하고 커밋하지 않는다) · compose에서는 AI 컨테이너를 멈춰 재현(smoke 9번).
  - 문구 누락은 FE-화면에게 목록으로(T-059에서 반영).
  - F-1~F-7은 §9.2 표 그대로 실행 → 증거 파일 → `rows/FA.md`.
- 커밋: `fix(fe): 스트림 error UI [T-039]` · `docs(security): 프론트 점검 F-1~F-7 [T-039]` — 화면 코드와 점검 기록은 커밋을 나눈다.

### T-063 백엔드 정적·입력 점검 B-1·B-8·B-10·B-11 (D4 · 선행 T-026 · T-037)

- **수정 허용**: `security/evidence/B-1.txt` · `security/evidence/B-8.txt` · `security/evidence/B-10.txt` · `security/evidence/B-11.txt` · `security/rows/FA.md`
- **수용 기준 요지**: B-1 쿼리 이어붙이기 grep 0 + sort 인젝션 400 · B-8 500 응답에 스택 없음 · B-10 업로드 경계(300KB·.exe·이중 확장자) · B-11 필드별 400 `fields[]` · 증거 `security/evidence/B-*.txt` · 결과는 `security/rows/FA.md` · `check-sec-deploy` · `check-scope T-063` 무출력
- **확인 명령**:
  ```bash
  grep -rn '" *+ *[a-z]' backend/src/main --include=*Repository.java | wc -l
  ```
- **구현 지침**: §9.3 표 그대로(명령과 출력을 증거 파일에 그대로 붙인다).
- 커밋: `docs(security): B-1·8·10·11 점검 [T-063]`

### T-043 반응형 캡처 3장 + 6번 문서 내 절 (D5 · 선행 T-030)

- **수정 허용**: `docs/6-*` · `docs/img/`
- **수용 기준 요지**: 390·768·1280 캡처 `docs/img/` · `docs/6-` 내 절 TODO 0 · `check-sec-deploy` · `check-scope T-043` 무출력
- **확인 명령**:
  ```bash
  grep -c 'TODO(' docs/6-*
  ```
  (파일 전체를 센다 — §9의 기술 리드 TODO가 남아 있으면 내 절이 0이어도 0이 아니다. `grep -n`으로 줄을 보고 판단한다.)
- **구현 지침**:
  1. 캡처 3장 — 브라우저 개발자도구 기기 모드 · 리포트가 흘러나온 상태 · 파일명은 6번 §8 TODO 주석 그대로 `docs/img/analysis-390.png` · `analysis-768.png` · `analysis-1280.png`.
     CSS를 고쳐야 하면 이 티켓에서는 못 한다(`Analysis.module.css`는 T-022 수정 허용) — 반응형은 T-022에서 끝낸다.
  2. 6번 문서 내 절(아래 §7 표) — "구현 예정 T-0xx" 표시를 지우고 실물로: §2 구조(`DocumentPicker`·`MessageList`·`FollowUpForm`은 `AnalysisPage.jsx` 안 함수 · `ReportText`·`SourceChips`는 기술 리드 파일) ·
     §5.3 `useChatStream` 행(`useChatStream()` 인자 없음 · SPEC §5 반환 7개 + 확장 `hydrate(messages, id)`의 두 번째 인자 · `reset` — "확장"으로 표시) · §8 캡처 경로 · URL 교체 시점(SPEC §5).
  3. §6의 `chatStore` 최종 모양은 FE-화면(§6 오너)에게 알려 준다.
  4. 같은 파일을 FE-화면(T-060)도 고친다 — 작업 전 `git pull origin feature/frontend`, 내 절만 고친다.
- 커밋: `docs(fe): 6번 분석 화면·반응형 캡처 [T-043]`

## 4. 받는 것 · 주는 것

| 무엇 | 누구에게서/에게 | 언제 |
|---|---|---|
| `streamPost`·`createSseParser`·`decodeData`·`api`·`components/`·`ROUTES` | FE-화면 → 나 | D1 — **공용 파일은 내가 고치지 않는다**(위 경계). 필요하면 FE-화면 티켓으로 |
| `ReportText`·`SourceChips` 완성본 + import 방법 | 기술 리드 → 나 | D2(T-054 — T-022 선행) |
| `ErrorMessage` 문구 누락 목록 | 나 → FE-화면(요청) | D4(T-039 → T-059) |
| 목 스트림(`mock/server.mjs`) | 기술 리드 → 나 | D1 |
| 실 스트림(`/api/analyses/stream`) | BE-기능 → 나 | D3(T-025) — 목과 이벤트가 같으면 코드 변경 0 |
| nginx 스트림 설정(`proxy_buffering off`) | DevOps → 나 | D3 E2E(T-032) |
| "S-01 재현 완료" → T-026 머지 | 나 → BE-기능 | D3(T-062 → T-026) |
| `security/rows/FA.md` 완료 | 나 → 기술 리드 | D4(T-034에서 원장으로) |
| `chatStore` 최종 모양(6번 §6) | 나 → FE-화면 | D5(T-060) |
| 시연 E2E(가입→업로드→스트리밍) | 나 → 팀장(발표) | D5 녹화 · D6 라이브 |

## 5. 일정 (`tasks/BOARD.md` · `tasks/ROADMAP.md`)

| 일 | 티켓 |
|---|---|
| D1 (11/5 목) | T-010 · 골든셋 문항 일부 작성해 AI에게(T-011 — FE 둘·DevOps가 나눠 보낸다) |
| D2 (11/6 금) | T-022 (판정 4 green) |
| D3 (11/9 월) | T-062(오전 — T-026 머지 전) · T-030 · compose E2E(T-032)에서 스트리밍 확인 |
| D4 (11/10 화) | T-039 · T-063 |
| D5 (11/11 수) | T-043 · EC2 클릭 경로(T-047 — 팀장 진행 · 전원) · 시연 영상 녹화 · 저녁 기능 동결 |
| D6 (11/12 목) | 버그 수정만 · 리허설(E2E 시연 담당) |

## 6. 막힐 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| 첫 글자가 사라짐 | `data:` 뒤를 6글자로 잘랐다 | 직접 자르지 말고 `createSseParser` 사용(공백 0~1 허용) |
| 토큰에 따옴표·`\n` 글자가 보임 | JSON 문자열을 디코드 안 함 | `decodeData(data)` |
| 판정 ① red — 본문 불일치 | 요청에 `question: ''` 등 키를 더함 | `req`를 그대로 보낸다 |
| 판정 ②만 red — 역할 순서 | USER를 ASSISTANT 뒤에 넣음 · 새 분석에도 USER를 넣음 | 후속일 때만 USER 먼저 |
| 판정 ④ red | `streamPost`의 throw를 안 잡음 | `catch`에서 `setError(e)` |
| `EventSource`로 짰더니 401 | POST·헤더 불가 | `fetch`(=`streamPost`) + `getReader` |
| compose에서 리포트가 한꺼번에 뜸 | nginx 버퍼링 | DevOps에 `/api/analyses/stream` `proxy_buffering off` 확인 요청 |
| 새 분석 직후 대화가 사라지거나 서버 대화로 덮임 | URL 교체 → 로드 효과가 스트리밍 중에 돌았다 | 로드 효과 가드 `streaming \|\| id === analysisId`면 건너뜀(SPEC §5) |
| "새 분석"을 눌렀는데 이전 대화가 남음 · 다시 이전 분석 URL로 튕김 | 같은 컴포넌트라 훅 상태가 남는다 | `id`가 없어지면 `reset()` · URL 교체는 `!id && streaming && analysisId`일 때만 |
| 중단 후 "요청을 취소했습니다" 에러가 뜸 | 응답 전 중단은 `ApiError` `ABORTED`로 온다(`AbortError`가 아니다) | `isAbort(e)` = `AbortError` 또는 `code === 'ABORTED'` |
| 스트림 중 401 뒤 로그인 화면으로 | `streamPost`가 refresh 실패·그 밖 401에서 세션을 비운다(정상) | 다시 로그인 — 반복되면 FE-화면에게 |
| 로그아웃 뒤 다른 계정에 이전 선택이 남음 | `chatStore`에 필드를 더하고 `reset`에서 안 비움 | `reset`이 새 필드까지 비우게 |
| 웹 출처 클릭 시 스크립트 실행 | `SourceChips` 대신 직접 `<a>`를 그렸다 | `SourceChips`만 쓴다 · 스킴 검사 문제는 기술 리드에게 |

## 7. 내가 쓰는 문서

| 문서·절 | 정본 | 티켓 |
|---|---|---|
| `docs/6-Frontend개발명세서.md` 파일 오너(리뷰) · 내 절: §2 구조의 `analysis/` 줄 · §4 주요 페이지(분석 행) · §5.2 채팅 컴포넌트 · §5.3 커스텀 Hook(`useChatStream` 행 — `useUpload` 행은 FE-화면) · §8 주요 기능(스트리밍·반응형 캡처) | 이 문서 §3 · 코드 | T-043 |
| §5.1 · §6 · §7은 FE-화면 절(T-060 · FE-화면 커밋 · 내가 리뷰) · §9 프론트엔드 보안은 6번 머리말상 기술 리드 절 — 내 F-1~F-7 결과(`rows/FA.md`)가 근거 | — | — |
| `security/rows/FA.md` — S-01 · B-1·B-8·B-10·B-11 · F-1~F-7 | §9 · 실행한 명령 | T-062 · T-063 · T-039 |
| `docs/wire/analysis.png` | 종이 와이어 | T-010 |

## 8. 코딩 에이전트에 맡길 때 (예: T-022)

```
너는 React 18 + Vite 프로젝트(frontend/)에서 일한다. 정본은 SPEC.md §4.3 · §5 (아래 붙임).
목표: src/hooks/useChatStream.js 를 구현해 `npx vitest run src/hooks/useChatStream.test.jsx` 4개를 green으로 만들고, src/pages/analysis/AnalysisPage.jsx 에서 쓴다.
훅 반환: { messages, streaming, error, analysisId, start, stop, hydrate, reset }. start(req)는 스트림이 끝날 때까지 기다리는 async 함수다.
req는 {postingId, resumeId} 또는 {analysisId, question} — 이 객체를 그대로 본문으로 보낸다(키 추가 금지).
재료: api/client.js 의 streamPost(path, body, signal) · api/sse.js 의 createSseParser, decodeData · res.body.getReader() + TextDecoder.
이벤트: analysis→analysisId, token→decodeData 후 마지막 ASSISTANT content에 이어 붙임, sources→마지막 ASSISTANT sources, error→error 상태.
후속 질문이면 USER 메시지를 먼저 넣고 그다음 빈 ASSISTANT를 넣는다. 새 분석에는 USER를 넣지 않는다.
중단은 AbortController — AbortError와 ApiError code 'ABORTED'는 에러가 아니다(마지막 ASSISTANT에 stopped: true). 시작 전 ApiError는 error에 넣는다.
ASSISTANT 렌더는 import ReportText from './ReportText.jsx' 의 <ReportText text={...} />, 출처는 <SourceChips sources={...} /> — 두 파일은 고치지 않는다.
DocumentPicker·MessageList·FollowUpForm은 AnalysisPage.jsx 안 함수 컴포넌트로 만들고 PropTypes를 단다. HTML 주입 API 금지.
수정 허용: src/hooks/useChatStream.js · src/stores/chatStore.js(reset 유지) · src/pages/analysis/AnalysisPage.jsx · src/pages/analysis/Analysis.module.css 만.
고치지 말 것: src/hooks/useChatStream.test.jsx · src/pages/analysis/ReportText* · SourceChips* · src/api/ · src/components/ · src/test/.
끝나면 실행한 명령과 테스트 출력을 그대로 붙여라. commit은 하지 마라.
```

## 9. 보안 — 기술 리드와 나눠 맡는 몫 (D3 재현 · D4 점검)

방어 코드(`ReportText`·`SourceChips`, CSP, 소유 검증)는 다른 사람이 쓰고, **재현·점검·증거·기록은 내가** 한다(쓴 사람과 확인하는 사람을 나눈다 — SPEC §7).
기록은 **`security/rows/FA.md` 한 파일에만** 쓴다. 원장(`security/LEDGER.md`)·9번 보안점검서는 기술 리드가 내 파일을 옮겨 적는다(T-034) — 둘이 같은 파일을 고치면 충돌난다.
결과 칸은 `발견`·`미발견`·`해당 없음(사유)`·`미조치(→ §7)` 중 하나 — 점검 방법 칸에는 **실제로 한 것**을 적는다.

| 내 몫 | 티켓 | 날 |
|---|---|---|
| S-01 IDOR 재현(조치 전) → T-026 머지 뒤 재확인 | T-062 | D3 |
| F-1~F-7 프론트 점검 | T-039 | D4 |
| B-1 · B-8 · B-10 · B-11 백엔드 정적·입력 점검 | T-063 | D4 |
| 기술 리드에 남는 것 | 원장 취합 · S-02 · S-03 · 나머지 B·A·I 행 · 9번 최종 | — |

### 9.1 S-01 재현 (T-062 · D3 · **T-026 머지 전에**)
조치 전 = T-014(문서 API · 소유 검증 없음)가 머지되고 T-026은 아직인 시점. 백엔드를 띄운다(`./mvnw spring-boot:run` 또는 compose).
```bash
# 시드(V2__seed.sql): kim(문서 1·2) · lee(문서 3·4, 분석 1) — 비밀번호 둘 다 Passw0rd!
T=$(curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"kim@example.com","password":"Passw0rd!"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.accessToken')
mkdir -p security/evidence/S-01
curl -s localhost:8080/api/documents/3 -H "Authorization: Bearer $T" | tee security/evidence/S-01/before.json   # 200이면 발견
curl -s localhost:8080/api/analyses/1/messages -H "Authorization: Bearer $T" >> security/evidence/S-01/before.json
git rev-parse --short HEAD > security/evidence/S-01/before-commit.txt
```
- Burp: Proxy로 `GET /api/documents/1`(내 것) 잡기 → Repeater → id를 3으로 → 200 화면 캡처 `S-01/burp-before.png`
- 채널에 **"S-01 재현 완료"** → BE-기능이 T-026 머지 → `git pull` 후 같은 두 요청 → `after.json`(403 봉투) · `burp-after.png` · 백엔드 로그의 AUDIT 줄 `audit.log`
- 이미 T-026이 머지돼 버렸으면: `git switch -c demo/S-01 $(cat security/evidence/S-01/before-commit.txt)` 에서 재현하고 rows/FA.md에 "방어 해제 브랜치에서 재현"이라고 그대로 쓴다(`demo/S-0N`은 임시 브랜치 — 통합 브랜치에 병합하지 않는다 · GitHub규약 §1)

### 9.2 F-1~F-7 (T-039 · D4)

| 행 | 점검 방법 | 증거 파일(`security/evidence/`) |
|---|---|---|
| F-1 XSS | 문서 제목·질문·(목 응답)에 `<img src=x onerror=alert(1)>`·`<script>` 입력 → 글자로 보이고 alert 없음 · 출처 웹 링크 `javascript:` 가 링크가 아님(`ReportText.test.jsx` 결과도 첨부) · `curl -sI http://localhost/ \| grep -i content-security` | `F-1.png` · `F-1-csp.txt` |
| F-2 토큰 저장 | DevTools → Application → localStorage `jobgap-auth`에 `refreshToken`·`user`만, `accessToken` 없음 | `F-2.png` |
| F-3 라우트·변조 토큰 | 비로그인으로 `/documents` 직접 접근 → `/login` · localStorage refresh를 임의 값으로 바꾸고 새로고침 → 요청 전 refresh가 실패해 세션이 비워지고 로그인 화면 | `F-3.txt` |
| F-4 번들 키 | `npm run build && grep -rn "sk-\|tvly-\|OPENAI" dist` 0줄 · `VITE_*`는 `VITE_API_URL` 하나 | `F-4.txt` |
| F-5 의존성 | `npm audit --json > ../security/evidence/npm-audit.json` · High 이상이면 `발견` → 기술 리드에게(버전 올림은 `fix(security)` 커밋) | `npm-audit.json` |
| F-6 입력 검증 | 업로드 `.exe`·300KB → 화면에서 먼저 안내(서버 415/413도 확인) · 질문 1001자 | `F-6.txt` |
| F-7 에러 처리 | 500·503 응답일 때 화면 문구가 `ErrorMessage`의 사용자 문구(서버 message·스택 아님) · 423은 해제 시각만 · `ErrorMessage.test.jsx` 결과 첨부 | `F-7.png` |

### 9.3 B-1 · B-8 · B-10 · B-11 (T-063 · D4 · 백엔드 띄우고 `$T`는 9.1 명령)

| 행 | 점검 방법 | 증거 |
|---|---|---|
| B-1 SQL Injection | `grep -rn '" *+ *[a-z]' backend/src/main --include=*Repository.java \| wc -l` → 0 · `curl -s "localhost:8080/api/documents?sort=title%27%20OR%20%271%27=%271" -H "Authorization: Bearer $T"` → 400 봉투(sort 허용 목록 밖 — SPEC §4.2) | `B-1.txt` |
| B-8 예외 노출 | 깨진 JSON 본문 `curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' -d '{'` → 응답에 `Exception`·`at com.` 없음 | `B-8.txt` |
| B-10 업로드 | compose(`http://localhost`, nginx 경유)로 300KB `.md` → 413 봉투 · 1MB 초과 → nginx 413 · `a.exe` · `a.html` · `a.md.exe` → 415 (SPEC §1 업로드 행) | `B-10.txt` |
| B-11 입력 검증 | 가입에 이메일 형식 틀림·비밀번호 3자 → 400 + `fields[]`에 필드별 항목 | `B-11.txt` |

### 9.4 rows/FA.md 쓰는 법
행마다 원장과 같은 칸(점검 방법 · 결과 · 재확인 · 증거)을 채운다. 다 쓰면 기술 리드에게 "rows/FA.md 완료" — 기술 리드가 T-034에서 원장으로 옮긴다.
커밋: `docs(security): S-01 재현 증거 [T-062]` · `docs(security): 프론트 점검 F-1~F-7 [T-039]` · `docs(security): B-1·8·10·11 점검 [T-063]` — 방어 코드는 내 커밋에 넣지 않는다.

## 10. 내 티켓 전체 (최신 · `tasks/BOARD.md`의 FA 행 — 위 절과 번호가 다르면 이 표가 이긴다)

| 날 | 티켓 | 할 일 | 선행 | 확인 |
|---|---|---|---|---|
| D1 | [T-010](../tasks/T-010-analysis-wire.md) | 분석 화면 와이어(종이 1장)를 SPEC §4.3과 대조하고, 목 스트림을 직접 읽어 본다. | T-009 | `(사진·콘솔 캡처를 PR 설명에)` |
| D2 | [T-022](../tasks/T-022-chat-stream.md) | useChatStream과 분석 화면 기본(선택 → 스트리밍 → 중단). | T-010 · T-054 | `cd frontend && npx vitest run src/hooks` |
| D3 | [T-062](../tasks/T-062-s01-reproduce.md) | S-01 IDOR 재현 — 조치 전 커밋에서 kim 토큰으로 lee 문서·분석을 열어 200을 캡처하고, T-026 머지 뒤 같은 요청 403으로 재확인한다. | T-014(머지·소유 검증 없음) · T-015 | `curl -s localhost:8080/api/documents/3 -H "Authorization: Bearer $T"` |
| D3 | [T-030](../tasks/T-030-followup-ui.md) | 후속 질문·기록 재진입(hydrate)·분석 화면 상태 테스트. | T-022 | `cd frontend && npm test` |
| D4 | [T-039](../tasks/T-039-fe-security-check.md) | 스트림 error UI + 프론트 보안 점검 F-1~F-7(증거·기록). | T-022 · T-054 | `cd frontend && npm test` |
| D4 | [T-063](../tasks/T-063-be-static-check.md) | 백엔드 정적·입력 점검 B-1·B-8·B-10·B-11 — 실행한 명령과 결과를 기록한다. | T-026 · T-037 | `grep -rn '" *+ *[a-z]' backend/src/main --include=*Repository.java \| wc -l` |
| D5 | [T-043](../tasks/T-043-responsive-docs6.md) | 반응형 캡처 3장 + 6번 문서 내 절. | T-030 | `grep -c 'TODO(' docs/6-*` |

매일 규칙: `onboarding/README.md` · git: `onboarding/GitHub규약.md` · 화면 눈 검사: `seams/smoke.md` · 하루 끝 3줄: `worklog/<내이름>/D#.md`
