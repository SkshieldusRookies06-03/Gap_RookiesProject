# 레인 명세 — FE-화면 (FE 화면 4 + 프론트 공용)

> 정본은 `SPEC.md`(§4 API · §5 화면). 이 문서는 "어떻게"까지 내려간 실행 명세다 — SPEC과 다르면 SPEC이 이긴다.
> 지시서: `tasks/T-009·T-020·T-021·T-031-*.md` · 일정: `tasks/BOARD.md`.

## 0. 판정 테스트

| 파일 | 무엇을 보나 | 티켓 | D1 상태 |
|---|---|---|---|
| `frontend/src/api/client.test.js` (5) | 봉투 벗기기 · `ApiError`(code·status) · nginx HTML 413 → `FILE_TOO_LARGE` · `TOKEN_EXPIRED` 동시 2요청에 refresh 1회 · Access는 localStorage에 없음 | T-009 | green — 깨지 않게 |
| `frontend/src/api/sse.test.js` (4) | 프레임 조각 모으기 · `data:` 공백 0개 · CRLF · `decodeData` | T-009 | green — 깨지 않게 |
| `frontend/src/pages/DocumentsPage.test.jsx` (4) | 로딩 `role=status` · 빈 문구 `"공고나 이력서를 올려 보세요"` · 에러 `role=alert` + 서버 message 노출 금지 · 정상 = 제목 텍스트, 제목 속 `<img>`는 글자로(img 요소 0) | T-021 | **red** |
| `frontend/src/pages/LoginPage.test.jsx` | 만들 것(내 테스트 · T-020) — 실패 문구 1 · 성공 시 이동 1 | T-020 | 없음 |
| `frontend/src/pages/AnalysesPage.test.jsx` | 만들 것(내 테스트 · T-031) — 상태 넷 중 빈·정상 + INCOMPLETE "중단됨" | T-031 | 없음 |

판정 테스트 파일(`DocumentsPage.test.jsx`)은 고치지 않는다. 틀려 보이면 기술 리드에게.

## 1. 완료 정의 (D5 저녁)

- [ ] `npm run build` 성공 · `npm test` 중 내 판정 테스트 전부 green
- [ ] 로그인 → 내 문서 → 업로드 → 분석 기록 → 분석 화면 진입이 **compose(nginx 경유)**에서 클릭으로 된다
- [ ] 4화면 모두 상태 넷(로딩·빈·에러·정상) · 에러 문구는 SPEC §4.4 "프론트 표시" 열
- [ ] 공용 컴포넌트 3개 이상이 2화면 이상에서 쓰인다(R-FE01) · 전부 `PropTypes`
- [ ] 390·768·1280에서 가로 스크롤 0(내 문서 화면 · 390은 눈으로 1회)
- [ ] 문서 제목·사용자 입력은 전부 JSX 텍스트(`{title}`) — HTML 주입 API 0(F-1)
- [ ] 1번 프로젝트계획서 FILL 0 · README 실행 절차 · 발표 자료 골격(D5)

## 2. 만들/고칠 파일

| 경로 (`frontend/src/`) | 역할 | 티켓 |
|---|---|---|
| `api/client.js` · `api/sse.js` | 있음(완성) — 바꿀 때는 `client.test.js`·`sse.test.js` green 유지 | T-009 |
| `stores/authStore.js` | 있음(완성) — `useAuthStore` · `setSession` · `clear` · persist `jobgap-auth` | T-009 |
| `components/Button.jsx` · `LoadingSpinner.jsx` · `EmptyState.jsx` · `ErrorMessage.jsx` · `Layout.jsx` (+ `*.module.css`) | 있음 — `ErrorMessage`의 `BY_CODE`에 문구 추가(아래 §3.3) | T-009·T-021 |
| `pages/LoginPage.jsx` · `pages/RegisterPage.jsx` · `pages/Auth.module.css` | 만들 것(골격 있음) | T-020 |
| `pages/DocumentsPage.jsx` · `pages/Documents.module.css` | 만들 것(골격 있음) | T-021 |
| `hooks/useUpload.js` · `hooks/useUpload.test.js` | 만들 것(골격 있음) | T-021 |
| `pages/AnalysesPage.jsx` · `pages/Analyses.module.css` · `pages/AnalysesPage.test.jsx` | 만들 것(골격 있음) | T-031 |
| `routes.js` · `App.jsx` | 있음 — 라우트 추가 금지(화면 5 고정) | — |

`pages/analysis/` · `hooks/useChatStream.js` · `stores/chatStore.js` 는 FE-분석 파일 — 손대지 않는다.

## 3. 티켓별 구현 명세

### 3.1 T-009 프론트 골격 (D1 · 선행 없음)

1. `npm ci && npm run build && npx vitest run src/api` → 9 passed 확인.
2. `node mock/server.mjs` + `VITE_API_URL=http://localhost:8080 npm run dev` → `/login`이 뜬다(골격 "TODO" 문구면 정상).
3. 커밋: `chore(fe): 프론트 골격 [T-009]`

알아 둘 API(`api/client.js` — 이미 있음):

| export | 시그니처 | 동작 |
|---|---|---|
| `api.get/post/put/del` | `(path, body?, opts?)` | 성공 봉투의 `data`만 반환 · 실패면 `ApiError` throw |
| `api.upload` | `(path, formData)` | multipart · Content-Type은 브라우저가 붙인다(직접 넣지 않는다) |
| `ApiError` | `{ status, code, message, fields[] }` | `code`로 분기 · `fields`는 400 필드 오류 |
| `streamPost` | `(path, body, signal)` | FE-분석 전용 |

401 처리: `TOKEN_EXPIRED`만 refresh 후 재시도 · 그 밖의 401은 `authStore.clear()`(로그인 API는 예외) → `Protected`가 `/login`으로 보낸다.

### 3.2 T-020 로그인·회원가입 (D2 · 선행 T-009)

컴포넌트 트리
```
LoginPage                      RegisterPage
 └ form (Auth.module.css)       └ form
    ├ input email/password         ├ input email/password/name
    ├ ErrorMessage? / 문구          ├ 필드별 오류 <p> (fields[])
    ├ Button type=submit           ├ Button type=submit
    └ Link → ROUTES.REGISTER       └ Link → ROUTES.LOGIN
```

| 동작 | 호출 | 성공 | 실패(code → 문구) |
|---|---|---|---|
| 로그인 제출 | `api.post('/api/auth/login', {email, password})` → `{accessToken, refreshToken, user}` | `useAuthStore.getState().setSession(data)` → `navigate(ROUTES.DOCUMENTS)` | `INVALID_CREDENTIALS` → "이메일 또는 비밀번호가 올바르지 않습니다" · `ACCOUNT_LOCKED` → `e.message`(해제 시각이 들어 있다) · 그 밖 → `messageFor(e)` |
| 가입 제출 | `api.post('/api/auth/register', {email, password, name})` → `{uuid, email, name}` | `navigate(ROUTES.LOGIN)` + "가입되었습니다. 로그인하세요" | `VALIDATION_ERROR` → `e.fields`를 `field`별로 입력칸 아래 · `DUPLICATE_EMAIL` → 이메일 칸 아래 "이미 가입된 이메일입니다" |

상태: 로딩 = 제출 중 버튼 `disabled` + 라벨 "로그인 중…" · 빈 = 해당 없음 · 에러 = 위 표 · 정상 = 폼.
클라이언트 검증(왕복 줄이기 · 정본은 서버 400): `type="email" required` · 비밀번호 `minLength={8} maxLength={64}` · 이름 `maxLength={20}`.
이미 로그인 상태(`refreshToken` 있음)로 `/login` 진입 → `<Navigate to={ROUTES.DOCUMENTS} replace />`.

`LoginPage.test.jsx`(만들 것 · MSW로 `/api/auth/login` 401 → 문구 보임 1 · 200 → 스토어에 refreshToken 1). 테스트에서는 `<MemoryRouter>`로 감싼다.

커밋: `feat(fe): 로그인·회원가입 화면 [T-020]`

### 3.3 T-021 내 문서 + useUpload (D2 · 선행 T-009) — 판정 테스트 4

컴포넌트 트리 (`pages/DocumentsPage.jsx` **한 파일 안**에서 함수로 나눈다 — T-021 수정 허용은 이 파일·CSS·useUpload뿐)
```
DocumentsPage
 ├ UploadForm   (type select · title input · file input accept=".md,.txt" · Button "올리기")
 ├ Toolbar      (탭: 전체/공고/이력서 · 정렬 select)
 ├ 상태 분기     LoadingSpinner | ErrorMessage(onRetry) | EmptyState | DocumentList
 │   └ DocumentRow × n  (제목 · 종류 · 글자 수 · 등록일 · [제목 수정] [삭제])
 └ Pager        (이전 · "1 / 3" · 다음)
```

상태 넷 (판정 테스트가 그대로 본다)

| 상태 | 조건 | 렌더 |
|---|---|---|
| 로딩 | 첫 요청 응답 전 | `<LoadingSpinner />` (`role="status"`) |
| 빈 | `data.content.length === 0` | `<EmptyState message="공고나 이력서를 올려 보세요" />` — 문구 한 글자도 바꾸지 않는다 |
| 에러 | `ApiError` | `<ErrorMessage error={e} onRetry={reload} />` — `role="alert"` · 서버 `message`를 그대로 붙이지 않는다(F-7) |
| 정상 | 목록 | 행마다 `{doc.title}` 텍스트 |

쓰는 API (SPEC §4.2 — 필드 이름 그대로)

| 동작 | 호출 | 성공 후 |
|---|---|---|
| 목록 | `GET /api/documents?type=&page=&size=20&sort=` → `{content[]: {id,type,title,charCount,createdAt}, page{number,size,totalElements,totalPages,first,last,numberOfElements}}` | 표 갱신 |
| 업로드 | `POST /api/documents` multipart `file`·`type`·`title` → `DocumentSummary` | 첫 페이지 다시 조회 · 폼 비우기 |
| 제목 수정 | `PUT /api/documents/{id}` `{title}` → `DocumentSummary` | 그 행만 바꾸거나 다시 조회 |
| 삭제 | `DELETE /api/documents/{id}` → `null` | 다시 조회(마지막 행을 지워 빈 페이지면 `page-1`) |

에러 문구 — `components/ErrorMessage.jsx`의 `BY_CODE`에 추가할 것(내 파일이지만 T-021 수정 허용 밖 → 같은 PR에서 티켓 수정 허용 줄에 `frontend/src/components/ErrorMessage.jsx`를 더하거나 별도 커밋 `[T-009]`): `DUPLICATE_TITLE` "같은 제목의 문서가 있습니다" ·
`VALIDATION_ERROR` "입력값을 확인하세요" · `DOCUMENT_TYPE_MISMATCH` "공고와 이력서를 각각 골라 주세요" · `ACCOUNT_LOCKED`·`INVALID_CREDENTIALS`(§3.2 문구).
`AI_UNAVAILABLE`(업로드·삭제 503)은 이미 있음 — 재시도 버튼을 보인다.

목록 쿼리스트링 구성 (탭 "전체"면 `type`을 아예 뺀다 — 빈 `type=`은 계약에 없는 값이다)
```js
const SORTS = [['createdAt,desc', '최신순'], ['createdAt,asc', '오래된순'], ['title,asc', '제목 가나다'], ['title,desc', '제목 역순']];
function listPath({ type, page, sort }) {
  const q = new URLSearchParams({ page: String(page), size: '20', sort });
  if (type) q.set('type', type);            // 'JOB_POSTING' | 'RESUME' | null(전체)
  return `/api/documents?${q}`;
}
// 탭·정렬이 바뀌면 page를 0으로 되돌린다. Pager 표시는 page.number + 1 / page.totalPages, 버튼은 page.first / page.last로 끈다.
```

useUpload 반환형과 클라이언트 검증 (F-6 — 서버 검증이 정본, 여기는 왕복 줄이기)
```js
import { useState } from 'react';
import { api, ApiError } from '../api/client.js';
const MAX = 200 * 1024;
export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  async function upload({ file, type, title }) {
    setError(null);
    const fail = (code, message) => { const e = new ApiError({ status: 0, code, message }); setError(e); throw e; };
    if (!file) return fail('VALIDATION_ERROR', '파일을 고르세요');
    if (!/\.(md|txt)$/i.test(file.name)) return fail('UNSUPPORTED_FILE', '.md 또는 .txt 파일만');
    if (file.size === 0) return fail('VALIDATION_ERROR', '빈 파일입니다');
    if (file.size > MAX) return fail('FILE_TOO_LARGE', '200KB 이하만');
    if (!title?.trim() || title.length > 100) return fail('VALIDATION_ERROR', '제목은 1~100자');
    const form = new FormData();
    form.append('file', file); form.append('type', type); form.append('title', title.trim());
    setUploading(true);
    try { return await api.upload('/api/documents', form); }
    catch (e) { setError(e); throw e; }
    finally { setUploading(false); }
  }
  return { upload, uploading, error };
}
```
`useUpload.test.js`(만들 것 · 내 테스트): `.exe` → `error.code === 'UNSUPPORTED_FILE'`이고 네트워크 호출 0 · 정상 → MSW 201 데이터 반환.

제목 인라인 수정 · 삭제 확인 (브라우저 `confirm()` 대신 행 안의 두 단계 버튼 — 테스트·자동화가 막히지 않는다)
```jsx
function DocumentRow({ doc, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState(null);
  const save = async () => {
    try { onSaved(await api.put(`/api/documents/${doc.id}`, { title })); setEditing(false); }
    catch (e) { setErr(e); }                                  // DUPLICATE_TITLE → 입력칸 아래 messageFor(e)
  };
  const remove = async () => {
    try { await api.del(`/api/documents/${doc.id}`); onDeleted(doc.id); }
    catch (e) { setErr(e); setConfirming(false); }            // AI_UNAVAILABLE(503)이면 문서는 그대로 남아 있다
  };
  // editing ? <input value={title} maxLength={100}/> + 저장/취소 : <span>{doc.title}</span>
  // confirming ? "삭제하면 이 문서를 쓴 분석도 지워집니다" + [삭제 확인] [취소] : [삭제]
}
DocumentRow.propTypes = { doc: PropTypes.shape({ id: PropTypes.string.isRequired, title: PropTypes.string.isRequired }).isRequired,
  onSaved: PropTypes.func.isRequired, onDeleted: PropTypes.func.isRequired };
```
삭제 안내 문구의 근거: SPEC §6.4(문서를 지우면 그 문서를 쓴 분석·메시지도 지워진다).

반응형 (`Documents.module.css` · 브레이크포인트 값은 `styles/tokens.css` 주석 — 768·1280)

| 폭 | 바뀌는 것 |
|---|---|
| < 768 (390 캡처) | 행 = 카드 세로 쌓기(제목 한 줄 · 종류·글자 수·날짜 둘째 줄 · 버튼 셋째 줄) · 업로드 폼 세로 · 탭 가로 스크롤 금지(줄바꿈) |
| 768~1279 | 표 형태 한 줄 · 업로드 폼 가로 |
| ≥ 1280 | `Layout`의 `--content-max` 안에서 여백만 커진다 |

색·간격은 `var(--color-*)`·`var(--space-*)`만(리터럴 금지 · ADR-07).

확인: `npx vitest run src/pages/DocumentsPage.test.jsx src/hooks/useUpload.test.js` · 목 서버로 업로드·수정·삭제 클릭 1회.
커밋: `feat(fe): 내 문서 화면·useUpload [T-021]` (기능) — 테스트만 따로면 `test(fe): useUpload 검증 [T-021]`

### 3.4 T-031 분석 기록 (D3 · 선행 T-009)

| 상태 | 렌더 |
|---|---|
| 로딩 | `LoadingSpinner` |
| 빈 | `EmptyState message="아직 분석이 없습니다" action={<Link to={ROUTES.ANALYSIS_NEW}>새 분석</Link>}` |
| 에러 | `ErrorMessage onRetry` |
| 정상 | 행: `{title}` · `{createdAt}`(로컬 표시) · `메시지 {messageCount}` · `lastStatus === 'INCOMPLETE'`면 배지 "중단됨" · 행 클릭 → `navigate(ROUTES.analysis(id))` |

API: `GET /api/analyses?page=0&size=20` → `content[]: {id,title,postingTitle,resumeTitle,messageCount,lastStatus,createdAt}` + `page`(최신순 고정 — 정렬 UI 없음) · Pager는 T-021과 같은 방식.
`AnalysesPage.test.jsx`(내 테스트): 빈 문구 1 · INCOMPLETE 행에 "중단됨" 1.
커밋: `feat(fe): 분석 기록 화면 [T-031]`

## 4. 받는 것 · 주는 것

| 무엇 | 누구에게서/에게 | 언제 |
|---|---|---|
| 목 서버·계약(SPEC §4) | 기술 리드 → 나 | D1 |
| 실 API | FE-화면(BE-인증 · auth D2) · BE-기능(documents D2·analyses D3) → 나 | D2~D3 — 목과 같은 응답이면 코드 변경 0 |
| `api/client.js`·`api/sse.js`·`components/`·`routes.js` | 나 → FE-분석 | D1부터 · FE-분석은 이 파일들을 고치지 않는다 — 필요한 것은 나에게 요청(예: `ErrorMessage` 문구 추가) |
| compose(nginx 경유) | DevOps → 나 | D3 E2E |
| 발표 슬라이드 원고(화면 시연) | 나 → 팀장 | D5 저녁 |

## 5. 일정

| 일 | 티켓 |
|---|---|
| D1 (11/5) | T-009 · T-003(저녁 동결 회의 참석 · 팀장 진행) |
| D2 (11/6) | T-020 · T-021 |
| D3 (11/9) | T-031 · compose E2E 클릭 확인 |
| D4 (11/10) | 공용 컴포넌트 재사용 확인(T-040 중 내 몫) · 에러 문구 점검 |
| D5 (11/11) | EC2 클릭 경로 · 6번 문서 내 절 FILL 0 |
| D6 (11/12) | 버그픽스 · 리허설 참여 · 내 슬라이드(화면 시연) |

## 6. 막힐 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| dev에서 모든 요청이 CORS 오류 | Vite가 5173이 아닌 포트로 뜸 · `VITE_API_URL` 없음 | `strictPort`라 포트 점유 프로세스 종료 · `VITE_API_URL=http://localhost:8080` |
| 새로고침하면 로그인 화면으로 | Refresh가 없다(로그아웃·다른 기기 로그인 ADR-02) | 정상 동작 — 다시 로그인 |
| 업로드가 "서버 응답을 해석할 수 없습니다" | nginx가 HTML 413(1MB 초과) | 클라이언트 200KB 검사로 미리 막힌다 — 우회됐으면 DevOps에 `client_max_body_size` 확인 |
| 탭 "전체"인데 결과가 한 종류만 | 이전 탭의 `type`이 남음 | §3.3 `listPath` — 전체면 키를 뺀다 |
| 정렬 바꾼 뒤 빈 화면 | page가 이전 값 그대로 | 탭·정렬 변경 시 page 0 |
| `DocumentsPage.test` 로딩 테스트만 red | 로딩 중 `LoadingSpinner`를 안 그림(초기 state가 null) | 첫 렌더부터 loading=true |
| 정상 테스트에서 img 요소가 생김 | 제목을 HTML로 렌더 | `{doc.title}` 텍스트로만 |

## 7. 내가 쓰는 문서

| 문서·절 | 정본 |
|---|---|
| `docs/6-Frontend개발명세서.md` §5.1 공통 컴포넌트 · §6 상태 관리 · §7 API 연동 (파일 오너 FE-분석 리뷰 · 내 절 = 내 커밋) | `components/` · `stores/authStore.js` · `api/client.js` |

## 8. 코딩 에이전트에 맡길 때 (예: T-021)

```
너는 React 18 + Vite 프로젝트(frontend/)에서 일한다. 정본은 SPEC.md §4.2 · §5 (아래 붙임).
목표: src/pages/DocumentsPage.jsx 와 src/hooks/useUpload.js 를 완성해 `npx vitest run src/pages/DocumentsPage.test.jsx` 4개를 green으로 만든다.
반드시 쓸 것: api/client.js 의 api.get/put/del/upload · components/ 의 LoadingSpinner·EmptyState·ErrorMessage·Button · routes.js 의 ROUTES.
상태 넷: 로딩=LoadingSpinner, 빈=EmptyState message="공고나 이력서를 올려 보세요"(문구 그대로), 에러=ErrorMessage(서버 message 노출 금지), 정상=목록.
목록 쿼리는 type이 없으면 키를 빼고, 탭·정렬이 바뀌면 page=0. 제목은 JSX 텍스트로만 렌더한다(HTML 주입 금지).
useUpload는 { upload, uploading, error }를 반환하고 .md/.txt·200KB·빈 파일·제목 1~100자를 먼저 검사한다.
수정 허용: src/pages/DocumentsPage.jsx · src/pages/Documents.module.css · src/hooks/useUpload.js · src/hooks/useUpload.test.js 만.
고치지 말 것: src/pages/DocumentsPage.test.jsx · src/api/ · src/test/ · 다른 화면. 색·간격은 styles/tokens.css 변수만.
끝나면 실행한 명령과 출력(테스트 결과)을 그대로 붙여라. commit은 하지 마라.
```

## 10. 내 티켓 전체 (최신 · `tasks/` 생성본 — 위 절과 번호가 다르면 이 표가 이긴다)

150줄 규칙으로 쪼갠 것: T-021 → T-021(목록·상태 넷) + **T-057**(업로드·수정·삭제) · 새 **T-059**(공용 컴포넌트 점검) · **T-060**(6번 내 절)

| 날 | 티켓 | 할 일 | 선행 |
|---|---|---|---|
| D1 | [T-009](../tasks/T-009-frontend-skeleton.md) | 프론트 골격을 받아 빌드·공용 테스트·목 연결을 확인한다 | T-001 |
| D2 | [T-020](../tasks/T-020-login-pages.md) | 로그인·회원가입 화면과 보호 라우트 | T-009 |
| D2 | [T-021](../tasks/T-021-documents-list.md) | 내 문서 목록 | T-009 |
| D2 | [T-057](../tasks/T-057-documents-write.md) | 업로드(useUpload)·제목 수정·삭제 확인 | T-021 |
| D3 | [T-031](../tasks/T-031-analyses-page.md) | 분석 기록 화면 | T-009 |
| D4 | [T-059](../tasks/T-059-fe-common-check.md) | 공용 컴포넌트 재사용·PropTypes·에러 문구 점검 | T-021 · T-031 |
| D5 | [T-060](../tasks/T-060-docs6-common.md) | 6번 문서 내 절(§5.1 공통 컴포넌트·§6 상태·§7 API 연동) | T-059 |

매일 규칙: `onboarding/README.md` · git: `onboarding/GitHub규약.md` · 화면 눈 검사: `seams/smoke.md` · 하루 끝 3줄: `worklog/<내이름>/D#.md`
