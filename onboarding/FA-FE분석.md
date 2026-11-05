# 레인 명세 — FE-분석 (분석 화면 · 스트리밍 · 후속 질문)

> 정본은 `SPEC.md` §4.3(스트림·이벤트) · §5(화면). 이 문서는 "어떻게"까지 내려간 실행 명세다 — SPEC과 다르면 SPEC이 이긴다.
> 지시서: `tasks/T-010·T-022·T-030-*.md` · 일정: `tasks/BOARD.md`(T-039·T-043 포함).
> **보안 분담**: S-01 재현 · F-1~F-7 · B-1·8·10·11 점검·기록(`security/rows/FA.md`)은 내 몫(§9). 원장·9번 취합은 기술 리드. 응답 렌더 컴포넌트(`ReportText`·`SourceChips`)는 기술 리드 몫 — 나는 import해서 쓴다.

## 0. 판정 테스트

| 파일 | 무엇을 보나 | 티켓 | D1 상태 |
|---|---|---|---|
| `frontend/src/hooks/useChatStream.test.jsx` ① | 새 분석: 요청 본문이 **정확히** `{postingId, resumeId}` · `analysisId === '7'` · 마지막 메시지 `role 'ASSISTANT'`, content = 토큰을 디코드해 이은 원문(줄바꿈 포함) · `sources` 타입 `['doc','web']` · `error === null` · 끝나면 `streaming === false` | T-022 | **red** |
| ② | 후속 질문: 본문 `{analysisId, question}` · messages 역할이 정확히 `['USER','ASSISTANT']` · `messages[0].content === question` | T-022 | **red** |
| ③ | `event: error` → `error.code === 'AI_UNAVAILABLE'` · `streaming === false` | T-022 | **red** |
| ④ | 시작 전 403 JSON 봉투 → `error.code === 'FORBIDDEN'` · `streaming === false` | T-022 | **red** |

테스트가 보는 계약: `const { messages, streaming, error, analysisId, start, stop } = useChatStream()` ·
`start(...)`는 **스트림이 끝날 때까지 기다리는 Promise**를 돌려준다(테스트가 `await result.current.start(...)` 한다).
이 파일은 고치지 않는다 — 틀려 보이면 기술 리드에게. 반환값을 더 늘리는 것(아래 `hydrate`)은 괜찮다.

## 1. 완료 정의 (D5 저녁)

- [ ] `npx vitest run src/hooks` 4 green · `npm run build` 성공
- [ ] 목 서버와 compose(nginx 경유) 둘 다에서: 공고·이력서 선택 → 리포트가 **시간 간격을 두고** 흘러나옴 → 출처 칩 → 후속 질문 → 기록에서 재진입하면 지난 대화가 보임
- [ ] 생성 중 표시 + 중단 버튼 · 중단하면 부분 답변은 화면에 남고 "중단됨" 표시
- [ ] 에러 4종(403·404·400 타입 불일치·스트림 error)이 사용자 문구로 보인다
- [ ] AI 응답·질문·출처 제목은 전부 텍스트 렌더(HTML 주입 0 · 웹 출처 URL은 http/https만 링크)
- [ ] 분석 화면 390·768·1280 캡처 3장(R-FE03) · 6번 문서 내 절 FILL 0

## 2. 만들/고칠 파일 (전부 내 수정 허용 안)

| 경로 (`frontend/src/`) | 역할 | 티켓 |
|---|---|---|
| `hooks/useChatStream.js` | 스트림 훅(판정 대상) | T-022 · T-030 |
| `stores/chatStore.js` | 있음 — 분석 화면 선택 상태(공고·이력서 id) 보관에 쓴다(아래 §3.2) | T-022 |
| `pages/analysis/AnalysisPage.jsx` | 화면 루트(라우트 `/analyses/new` · `/analyses/:id`) | T-022 · T-030 |
| `pages/analysis/DocumentPicker.jsx` | 만들 것 — 공고·이력서 선택 + 시작 | T-022 |
| `pages/analysis/MessageList.jsx` | 만들 것 — 대화 목록(USER/ASSISTANT) | T-022 |
| `pages/analysis/SourceChips.jsx` | 만들 것 — 출처 칩(doc/web) | T-030 |
| `pages/analysis/FollowUpForm.jsx` | 만들 것 — 후속 질문 입력 | T-030 |
| `pages/analysis/Analysis.module.css` | 만들 것 — 레이아웃·반응형 | T-022 |

읽기만 하는 것(FE-화면 파일 — 고치지 않는다): `api/client.js`(`streamPost`·`api`·`ApiError`) · `api/sse.js`(`createSseParser`·`decodeData`) ·
`components/`(`LoadingSpinner`·`EmptyState`·`ErrorMessage`·`messageFor`·`Button`) · `routes.js`(`ROUTES`).

## 3. 티켓별 구현 명세

### 3.1 T-010 골격 + 목 스트림 확인 (D1 · 선행 T-009)

1. 종이 와이어 1장: 선택 영역 · 대화 영역 · 생성 중/중단 · 출처 칩 · 후속 입력창. 화면의 데이터 요소마다 SPEC §4.3 필드 이름을 옆에 적는다
   (예: 칩 = `sources[].type`·`docType`·`chunk`·`url`·`title`) — 계약에 없는 요소가 있으면 기술 리드에게.
2. 목으로 스트림을 눈으로: `node mock/server.mjs` + `npm run dev` → 로그인(kim@example.com / Passw0rd!) 후 `AnalysisPage.jsx`에 임시 `useEffect`로
   `streamPost('/api/analyses/stream', {postingId:'12', resumeId:'15'})` → `getReader()`로 읽어 `console.log`. 토큰이 약 0.15초 간격으로 찍히면 정상. 임시 코드는 커밋하지 않는다.
3. 커밋: `chore(fe): 분석 화면 골격 [T-010]`

### 3.2 T-022 useChatStream + 분석 화면 (D2 · 선행 T-010) — 판정 테스트 4

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
| 중단 | `AbortError` | 에러로 보지 않는다 · 마지막 ASSISTANT에 `stopped: true` |

getReader 루프 · 이벤트별 갱신 · 중단 (핵심 조각 — 나머지 상태 선언은 직접)
```js
const ctrl = useRef(null);
const patchLast = (fn) => setMessages((m) => [...m.slice(0, -1), fn(m[m.length - 1])]);

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
    if (e.name === 'AbortError') patchLast((x) => ({ ...x, stopped: true }));
    else { setError(e); setMessages((m) => (m.at(-1)?.content === '' ? m.slice(0, -1) : m)); }
  } finally { setStreaming(false); }
}, []);
const stop = useCallback(() => ctrl.current?.abort(), []);
```
주의: `AbortError`는 `fetch`가 던지기도 하고 `reader.read()`가 던지기도 한다 — 둘 다 같은 `catch`로 온다. 언마운트 시 `useEffect(() => () => ctrl.current?.abort(), [])`.

기록 재진입용 반환값 추가 — `hydrate(analysisId, messages)` (테스트는 보지 않는다 · 만들 것)
```js
const hydrate = useCallback((id, list) => {
  setAnalysisId(id);
  setMessages(list.map(({ role, content, sources }) => ({ role, content, sources: sources ?? [] })));
}, []);
return { messages, streaming, error, analysisId, start, stop, hydrate };
```

컴포넌트 트리 · props
```
AnalysisPage                         (useParams().id · useNavigate · useChatStream)
 ├ DocumentPicker   (id 없을 때만)    props: { onStart: ({postingId, resumeId}) => void, disabled: bool }
 ├ MessageList                       props: { messages: [{role, content, sources, stopped?}] }
 │   └ 말풍선: content는 {m.content} 텍스트 · white-space: pre-wrap · stopped면 "중단됨"
 │   └ SourceChips  (ASSISTANT만)     props: { sources: [{type, documentId?, docType?, chunk?, score?, url?, title?}] }
 ├ streaming ? <LoadingSpinner label="생성 중…" /> + <Button variant="secondary" onClick={stop}>중단</Button> : null
 ├ error ? <ErrorMessage error={error} onRetry={retry} /> : null
 └ FollowUpForm     (analysisId 있고 !streaming)  props: { onSubmit: (question) => void, disabled: bool }
```
모든 컴포넌트에 `PropTypes`(R-FE01 · 공용 규칙).

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

선택값은 `useChatStore`가 아니라 Picker 지역 state로 충분하다. `chatStore.js`는 R-FE05 증거(Zustand 스토어 2개)라 지우지 않는다 —
"마지막으로 고른 공고·이력서" 기억에 쓰면 된다(`setSelection` 같은 필드 추가는 내 파일이라 자유).

사용자 동작 흐름

| 동작 | 호출 | 결과 | 실패 문구 |
|---|---|---|---|
| 분석 시작 | `start({postingId, resumeId})` | 리포트 스트리밍 · `analysis` 이벤트로 id 받음 | 403 "접근 권한이 없습니다" · 404 "문서를 찾을 수 없습니다" · `DOCUMENT_TYPE_MISMATCH` "공고와 이력서를 각각 골라 주세요" · `AI_UNAVAILABLE` "분석 서버가 응답하지 않습니다" + 재시도 |
| 중단 | `stop()` | 부분 답변 + "중단됨" · 서버에는 답변이 저장되지 않는다(SPEC §4.3) | — |
| 후속 질문 | `start({analysisId, question})` | USER + ASSISTANT 추가 | 빈 질문은 버튼 `disabled`(서버 400 왕복 줄이기) · 1000자 `maxLength` |
| 재시도 | 마지막 요청 그대로 `start` | 실패한 빈 말풍선은 이미 제거됨 | — |

`DOCUMENT_TYPE_MISMATCH`·`VALIDATION_ERROR` 문구는 `ErrorMessage`(FE-화면 파일)의 `BY_CODE`에 아직 없다 → FE-화면에게 추가 요청(내가 고치지 않는다).

URL 교체 — 새 분석이 끝나면 `/analyses/new` → `/analyses/7` (새로고침·기록 재진입이 같은 화면이 되게)
```js
const { id } = useParams();
const navigate = useNavigate();
const { messages, streaming, error, analysisId, start, stop, hydrate } = useChatStream();

useEffect(() => {                                    // 스트림이 끝난 뒤에만 바꾼다 — 도중에 바꾸면 아래 로드 효과가 끼어든다
  if (!streaming && analysisId && id !== analysisId) navigate(ROUTES.analysis(analysisId), { replace: true });
}, [streaming, analysisId, id, navigate]);
```
`/analyses/new`와 `/analyses/:id`는 같은 `AnalysisPage`라 URL만 바뀌고 컴포넌트는 다시 마운트되지 않는다 — 그래서 아래 로드 효과에 가드가 필요하다.

### 3.3 T-030 후속 질문 · 출처 칩 · 기록 재진입 (D3 · 선행 T-022)

`/analyses/:id` 진입 시 지난 대화 로드 후 이어 쓰기
```js
const [loadState, setLoadState] = useState({ loading: false, error: null });
useEffect(() => {
  if (!id || id === analysisId) return;              // 방금 스트림으로 만든 분석이면 다시 불러오지 않는다
  let alive = true;
  setLoadState({ loading: true, error: null });
  api.get(`/api/analyses/${id}/messages?page=0&size=50`)
    .then((d) => { if (alive) { hydrate(id, d.content); setLoadState({ loading: false, error: null }); } })
    .catch((e) => alive && setLoadState({ loading: false, error: e }));   // 남의 분석 403 · 없음 404
  return () => { alive = false; };
}, [id, analysisId, hydrate]);
```
응답 `content[]: {id, role, content, sources, createdAt}`(오래된 순). 마지막이 USER면 그 질문은 중단·실패된 것 — 말풍선 아래 "답변 없음(중단됨)"으로 보인다.
한 분석의 메시지가 50개를 넘는 경우는 범위 밖(첫 페이지만).

| 상태(재진입) | 렌더 |
|---|---|
| 로딩 | `LoadingSpinner` |
| 빈 | 해당 없음(분석에는 최소 질문 1개) |
| 에러 | `ErrorMessage` (403·404) + `Link to={ROUTES.ANALYSES}` "기록으로" |
| 정상 | `MessageList` + `FollowUpForm` |

리포트 본문·출처 칩은 **기술 리드 컴포넌트를 import해서 쓴다**(T-054 · 고치지 않는다 — 필요한 게 있으면 기술 리드에게):
```jsx
import ReportText from './ReportText.jsx';      // 마크다운 일부(제목·표·목록)를 HTML 없이 그린다 — F-1 방어선
import SourceChips from './SourceChips.jsx';    // doc/web 구분 · 웹은 http(s)만 링크 · noopener
<ReportText text={m.content} />  <SourceChips sources={m.sources} />
```
(`type: 'web'`인데 URL이 http/https가 아니면 doc 분기로 떨어지지 않게 별도 텍스트로 보여도 된다 — 링크로만 만들지 않으면 된다.)

커밋: `feat(fe): 후속 질문·출처 칩·기록 재진입 [T-030]`

### 3.4 반응형 (`Analysis.module.css` · 브레이크포인트 768·1280 — `styles/tokens.css` 주석의 값)

| 폭 | 바뀌는 것 |
|---|---|
| < 768 (390 캡처) | Picker의 select 둘이 세로로 · 말풍선 폭 100% · 칩 줄바꿈 · FollowUpForm 화면 아래 붙음(`position: sticky; bottom: 0`) · 중단 버튼은 입력창 자리 |
| 768~1279 | select 둘 가로 한 줄 + 시작 버튼 · 말풍선 최대 폭 80% |
| ≥ 1280 | 대화 열 최대 폭을 고정하고 가운데 정렬(여백만 커짐) |

색·간격은 `var(--color-*)`·`var(--space-*)`만 · `@media (min-width: 768px)` · `@media (min-width: 1280px)` 두 줄은 반드시(R-FE03 게이트가 `@media`를 센다).

확인: `npx vitest run src/hooks` · 목 서버로 클릭 경로 · compose(D3)에서 토큰이 한꺼번에 오면 → §6 표.
커밋: `feat(fe): useChatStream·분석 화면 [T-022]`

### 3.5 D4~D5 (BOARD)

- **T-039 (D4)**: 스트림 `error` 이벤트 UI 확인(목 `?fail=1` 경로는 목 서버 쿼리라 화면에서는 AI 컨테이너를 멈춰 재현) · 에러 문구 누락을 FE-화면에게 목록으로 ·
  기술 리드의 XSS 재현 보조(F-1): 질문·문서 제목에 `<img src=x onerror=alert(1)>` → 글자로 보이는 캡처.
- **T-043 (D5)**: 분석 화면 390·768·1280 캡처 3장(브라우저 개발자도구 기기 모드 · 리포트가 흘러나온 상태) → `docs/6` §8 · 6번 문서 내 절.

## 4. 받는 것 · 주는 것

| 무엇 | 누구에게서/에게 | 언제 |
|---|---|---|
| `streamPost`·`createSseParser`·`decodeData`·`api`·`components/`·`ROUTES` | FE-화면 → 나 | D1 — **`api/`는 내가 고치지 않는다.** 필요하면 FE-화면 티켓으로 |
| `ErrorMessage` 문구 추가(`DOCUMENT_TYPE_MISMATCH`·`VALIDATION_ERROR`) | 나 → FE-화면(요청) | D2 |
| 목 스트림(`mock/server.mjs`) | 기술 리드 → 나 | D1 |
| 실 스트림(`/api/analyses/stream`) | BE-기능 → 나 | D3 — 목과 이벤트가 같으면 코드 변경 0 |
| nginx 스트림 설정(buffering off) | DevOps → 나 | D3 E2E |
| 시연 E2E(가입→업로드→스트리밍) | 나 → 팀장(발표) | D5 녹화 · D6 라이브 |

## 5. 일정

| 일 | 티켓 |
|---|---|
| D1 (11/5) | T-010 |
| D2 (11/6) | T-022 (판정 4 green) |
| D3 (11/9) | T-030 · compose E2E에서 스트리밍 확인 |
| D4 (11/10) | T-039 |
| D5 (11/11) | T-043 · EC2 클릭 경로 · 시연 영상 녹화 |
| D6 (11/12) | 버그 수정만 · 리허설(E2E 시연 담당) |

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
| 새 분석 직후 화면이 깜빡이며 대화가 사라짐 | URL 교체 → 로드 효과가 서버 대화로 덮어씀 | 로드 효과 가드 `id === analysisId`면 건너뜀 · URL 교체는 스트림 끝난 뒤 |
| 중단 후 에러 문구가 뜸 | `AbortError`를 에러로 처리 | `e.name === 'AbortError'` 분기 |
| 웹 출처 클릭 시 스크립트 실행 | URL 스킴 미검사 | `SAFE` 정규식 · `rel="noopener noreferrer"` |

## 7. 내가 쓰는 문서

| 문서·절 | 정본 |
|---|---|
| `docs/6-Frontend개발명세서.md` 파일 오너(리뷰) · 내 절: §4 주요 페이지(분석) · §5.2 채팅 컴포넌트 · §5.3 커스텀 Hook(`useChatStream`·`useUpload` 표 — useUpload 행은 FE-화면 절) · §8 주요 기능(스트리밍·반응형 캡처) · §9 프론트엔드 보안(F-1 텍스트 렌더·URL 스킴) | 이 문서 §3 · 코드 |
| §5.1 · §6 · §7은 FE-화면 절(FE-화면 커밋 · 내가 리뷰) | — |

## 8. 코딩 에이전트에 맡길 때 (예: T-022)

```
너는 React 18 + Vite 프로젝트(frontend/)에서 일한다. 정본은 SPEC.md §4.3 · §5 (아래 붙임).
목표: src/hooks/useChatStream.js 를 구현해 `npx vitest run src/hooks` 4개를 green으로 만들고, src/pages/analysis/AnalysisPage.jsx 에서 쓴다.
훅 반환: { messages, streaming, error, analysisId, start, stop, hydrate }. start(req)는 스트림이 끝날 때까지 기다리는 async 함수다.
req는 {postingId, resumeId} 또는 {analysisId, question} — 이 객체를 그대로 본문으로 보낸다(키 추가 금지).
재료: api/client.js 의 streamPost(path, body, signal) · api/sse.js 의 createSseParser, decodeData · res.body.getReader() + TextDecoder.
이벤트: analysis→analysisId, token→decodeData 후 마지막 ASSISTANT content에 이어 붙임, sources→마지막 ASSISTANT sources, error→error 상태.
후속 질문이면 USER 메시지를 먼저 넣고 그다음 빈 ASSISTANT를 넣는다. 새 분석에는 USER를 넣지 않는다.
중단은 AbortController — AbortError는 에러가 아니다(마지막 ASSISTANT에 stopped: true). 시작 전 ApiError는 error에 넣는다.
렌더는 텍스트로만(white-space: pre-wrap). HTML 주입 API 금지.
수정 허용: src/hooks/useChatStream.js · src/stores/chatStore.js · src/pages/analysis/ 만.
고치지 말 것: src/hooks/useChatStream.test.jsx · src/api/ · src/components/ · src/test/.
끝나면 실행한 명령과 테스트 출력을 그대로 붙여라. commit은 하지 마라.
```

## 9. 보안 — 기술 리드와 나눠 맡는 몫 (D3 재현 · D4 점검)

방어 코드(`ReportText`·`SourceChips`, CSP, 소유 검증)는 다른 사람이 쓰고, **재현·점검·증거·기록은 내가** 한다(쓴 사람과 확인하는 사람을 나눈다).
기록은 **`security/rows/FA.md` 한 파일에만** 쓴다. 원장(`security/LEDGER.md`)·9번 보안점검서는 기술 리드가 내 파일을 옮겨 적는다 — 둘이 같은 파일을 고치면 충돌난다.
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
# 시드: kim(문서 1·2) · lee(문서 3·4, 분석 1)
T=$(curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"kim@example.com","password":"Passw0rd!"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.accessToken')
mkdir -p security/evidence/S-01
curl -s localhost:8080/api/documents/3 -H "Authorization: Bearer $T" | tee security/evidence/S-01/before.json   # 200이면 발견
curl -s localhost:8080/api/analyses/1/messages -H "Authorization: Bearer $T" >> security/evidence/S-01/before.json
git rev-parse --short HEAD > security/evidence/S-01/before-commit.txt
```
- Burp: Proxy로 `GET /api/documents/1`(내 것) 잡기 → Repeater → id를 3으로 → 200 화면 캡처 `S-01/burp-before.png`
- 채널에 **"S-01 재현 완료"** → BE-기능이 T-026 머지 → `git pull` 후 같은 두 요청 → `after.json`(403 봉투) · `burp-after.png` · 백엔드 로그의 AUDIT 줄 `audit.log`
- 이미 T-026이 머지돼 버렸으면: `git switch -c demo/S-01 $(cat security/evidence/S-01/before-commit.txt)` 에서 재현하고 rows/FA.md에 "방어 해제 브랜치에서 재현"이라고 그대로 쓴다(머지하지 않는다)

### 9.2 F-1~F-7 (T-039 · D4)

| 행 | 점검 방법 | 증거 파일(`security/evidence/`) |
|---|---|---|
| F-1 XSS | 문서 제목·질문·(목 응답)에 `<img src=x onerror=alert(1)>`·`<script>` 입력 → 글자로 보이고 alert 없음 · 출처 웹 링크 `javascript:` 가 링크가 아님 · `curl -sI http://localhost/ \| grep -i content-security` | `F-1.png` · `F-1-csp.txt` |
| F-2 토큰 저장 | DevTools → Application → localStorage `jobgap-auth`에 refreshToken만, accessToken 없음 | `F-2.png` |
| F-3 라우트·변조 토큰 | 비로그인으로 `/documents` 직접 접근 → `/login` · localStorage refresh를 임의 값으로 → 다음 요청 후 로그인 화면 | `F-3.txt` |
| F-4 번들 키 | `npm run build && grep -rn "sk-\|tvly-\|OPENAI" dist` 0줄 · `VITE_*`는 `VITE_API_URL` 하나 | `F-4.txt` |
| F-5 의존성 | `npm audit --json > ../security/evidence/npm-audit.json` · High 이상이면 `발견` → 기술 리드에게(버전 올림은 `fix(security)` 커밋) | `npm-audit.json` |
| F-6 입력 검증 | 업로드 `.exe`·300KB → 화면에서 먼저 안내(서버 415/413도 확인) · 질문 1001자 | `F-6.txt` |
| F-7 에러 처리 | 500·503 응답일 때 화면 문구가 `ErrorMessage`의 사용자 문구(서버 message·스택 아님) | `F-7.png` |

### 9.3 B-1 · B-8 · B-10 · B-11 (T-063 · D4 · 백엔드 띄우고 `$T`는 9.1 명령)

| 행 | 점검 방법 | 증거 |
|---|---|---|
| B-1 SQL Injection | `grep -rnE '"\s*\+' backend/src/main --include=*Repository.java` 0줄 · `curl -s "localhost:8080/api/documents?sort=title%27%20OR%20%271%27=%271" -H "Authorization: Bearer $T"` → 400 봉투 | `B-1.txt` |
| B-8 예외 노출 | 깨진 JSON 본문 `curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' -d '{'` → 응답에 `Exception`·`at com.` 없음 | `B-8.txt` |
| B-10 업로드 | compose(`http://localhost`, nginx 경유)로 300KB `.md` → 413 · `a.exe` · `a.html` · `a.md.exe` → 415 | `B-10.txt` |
| B-11 입력 검증 | 가입에 이메일 형식 틀림·비밀번호 3자 → 400 + `fields[]`에 필드별 항목 | `B-11.txt` |

### 9.4 rows/FA.md 쓰는 법
행마다 원장과 같은 칸(점검 방법 · 결과 · 재확인 · 증거)을 채운다. 다 쓰면 기술 리드에게 "rows/FA.md 완료" — 기술 리드가 T-034에서 원장으로 옮긴다.
커밋: `docs(security): S-01 재현 증거 [T-062]` · `docs(security): 프론트 점검 F-1~F-7 [T-039]` · `docs(security): B-1·8·10·11 점검 [T-063]` — 방어 코드는 내 커밋에 넣지 않는다.

## 10. 내 티켓 전체 (최신 · `tasks/` 생성본 — 위 절과 번호가 다르면 이 표가 이긴다)

| 날 | 티켓 | 할 일 | 선행 |
|---|---|---|---|
| D1 | [T-010](../tasks/T-010-analysis-wire.md) | 분석 화면 와이어(종이 1장)를 SPEC §4.3과 대조하고, 목 스트림을 직접 읽어 본다 | T-009 |
| D2 | [T-022](../tasks/T-022-chat-stream.md) | useChatStream과 분석 화면 기본(선택 → 스트리밍 → 중단) | T-010 · T-054 |
| D3 | [T-062](../tasks/T-062-s01-reproduce.md) | S-01 IDOR 재현 | T-014(머지·소유 검증 없음) · T-015 |
| D3 | [T-030](../tasks/T-030-followup-ui.md) | 후속 질문·기록 재진입(hydrate)·분석 화면 상태 테스트 | T-022 |
| D4 | [T-039](../tasks/T-039-fe-security-check.md) | 스트림 error UI + 프론트 보안 점검 F-1~F-7(증거·기록) | T-022 · T-054 |
| D4 | [T-063](../tasks/T-063-be-static-check.md) | 백엔드 정적·입력 점검 B-1·B-8·B-10·B-11 | T-026 · T-037 |
| D5 | [T-043](../tasks/T-043-responsive-docs6.md) | 반응형 캡처 3장 + 6번 문서 내 절 | T-030 |

매일 규칙: `onboarding/README.md` · git: `onboarding/GitHub규약.md` · 화면 눈 검사: `seams/smoke.md` · 하루 끝 3줄: `worklog/<내이름>/D#.md`
