# 레인 명세 — FE-화면 (FE 화면 4 + 프론트 공용)

> 정본은 `SPEC.md`(§1 인증·업로드 행 · §4 API · §5 화면 · §8 레인). 이 문서는 "어떻게"까지 내려간 실행 명세다 — SPEC과 다르면 SPEC이 이긴다.
> 범위(수정 허용)·수용 기준·확인 명령의 정본은 티켓 파일 `tasks/T-009·T-020·T-021·T-057·T-031·T-059·T-060-*.md` · 일정: `tasks/BOARD.md`.

**내 브랜치·흐름** — 브랜치 `feature/frontend`(FE-분석과 같이 쓴다 · 티켓마다 새 브랜치를 만들지 않는다 · 필수 리뷰·승인·CODEOWNERS 없음 — `onboarding/GitHub규약.md`).
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
| `frontend/src/api/client.test.js` (5) | 봉투 벗기기 · `ApiError`(code·status) · nginx HTML 413 → `FILE_TOO_LARGE` · `TOKEN_EXPIRED` 동시 2요청에 refresh 1회 · Access는 localStorage에 없음(F-2) | T-009 | green — 깨지 않게 |
| `frontend/src/api/sse.test.js` (4) | 프레임 조각 모으기 · `data:` 공백 0개 · CRLF · `decodeData` | T-009 | green — 깨지 않게 |
| `frontend/src/api/session.test.js` (13) | 새로고침 직후(Access 없음·Refresh만) 요청 전 refresh 1회 복구 · 동시 요청 refresh 1회 · refresh 실패 시 세션 비움 · 로그인·가입은 먼저 refresh 안 함 · `streamPost` TOKEN_EXPIRED 재시도 · 스트림 401·refresh 실패 시 세션 비움 · 403은 세션 유지 · 연결 실패 `NETWORK_ERROR` · 사용자 중단 `ABORTED` / 타임아웃 `NETWORK_ERROR` · SSE CR·CRLF 조각 경계 3 (기술 리드 회귀) | T-009 | green — 깨지 않게 |
| `frontend/src/components/ErrorMessage.test.jsx` (5) | 423은 서버 message에서 해제 시각만 · 시각 없으면 기본 문구 · 서버 message 미노출(F-7) · `ABORTED`·`NETWORK_ERROR`·모르는 코드·null 문구 · `role=alert` + "다시 시도" (기술 리드 회귀) | T-009 | green — 깨지 않게 |
| `frontend/src/pages/DocumentsPage.test.jsx` (4) | 로딩 `role=status` · 빈 문구 `"공고나 이력서를 올려 보세요"` · 에러 `role=alert` + 서버 message 노출 금지 · 정상 = 제목 텍스트, 제목 속 `<img>`는 글자로(img 요소 0) | T-021 | **red** |
| `frontend/src/pages/LoginPage.test.jsx` | 만들 것(내 테스트) — 실패 문구 1 · 성공 시 스토어에 refreshToken 1 | T-020 | 없음 |
| `frontend/src/hooks/useUpload.test.js` | 만들 것(내 테스트) — `.exe` → `UNSUPPORTED_FILE` · 네트워크 0 · 정상 201 | T-057 | 없음 |
| `frontend/src/pages/AnalysesPage.test.jsx` | 만들 것(내 테스트) — INCOMPLETE 행 "중단됨" 1 | T-031 | 없음 |

판정·회귀 테스트 파일은 고치지 않는다. 틀려 보이면 기술 리드에게.
**CI 1단계(필수)** = `npm run build && npx vitest run src/api src/components`(공용 22 + ErrorMessage 5 — `.github/workflows/ci.yml`) — 내 공용 파일이 곧 CI 필수다.
2단계(`npm test` 전체)는 D5 기능 동결 전까지 현황판(red 허용) — D5 저녁 필수 전환(T-049).

## 1. 완료 정의 (D5 저녁)

- [ ] `npm run build` 성공 · CI 1단계 green · `npm test` 중 내 판정·내 테스트 전부 green
- [ ] 로그인 → 내 문서 → 업로드 → 분석 기록 → 분석 화면 진입이 **compose(nginx 경유)**에서 클릭으로 된다(`seams/smoke.md` 1·2·3·4·7·8번 줄)
- [ ] 4화면 모두 상태 넷(로딩·빈·에러·정상) · 에러 문구는 SPEC §4.4 "프론트 표시" 열 — `ErrorMessage`에 §4.4 코드 전부(T-059)
- [ ] 공용 컴포넌트 3개 이상이 2화면 이상에서 쓰인다(R-FE01) · 전부 `PropTypes`
- [ ] 390·768·1280에서 가로 스크롤 0(smoke 8번 · 내 문서 화면 · 390은 눈으로 1회)
- [ ] 문서 제목·사용자 입력은 전부 JSX 텍스트(`{title}`) — HTML 주입 API 0(F-1 · `check-sec-deploy` 무출력)
- [ ] 6번 문서 §5.1·§6·§7 실물 반영 · 내 절 TODO 0(T-060)

## 2. 만들/고칠 파일

| 경로 (`frontend/src/`) | 역할 | 티켓 |
|---|---|---|
| `api/client.js` · `api/sse.js` | 있음(완성) — 바꿀 때는 `src/api` 22개 green 유지 | T-009 |
| `stores/authStore.js` | 있음(완성) — `useAuthStore` · `setSession` · `clear` · persist `jobgap-auth`(`partialize` = refreshToken·user) | T-009 (수정 허용엔 없음 — 바꿀 일이 생기면 티켓부터) |
| `components/Button.jsx` · `LoadingSpinner.jsx` · `EmptyState.jsx` · `ErrorMessage.jsx` · `Layout.jsx` (+ `*.module.css`) | 있음 — `ErrorMessage`의 `BY_CODE`는 SPEC §4.4와 대조해 빠진 코드만 추가(T-059) | T-009 · T-059 |
| `styles/tokens.css` · `styles/global.css` | 있음 — 색·간격·브레이크포인트 토큰(ADR-07) | T-009 |
| `pages/LoginPage.jsx` · `pages/RegisterPage.jsx`(골격 있음) · `pages/Auth.module.css` · `pages/LoginPage.test.jsx`(새로 만듦) | 로그인·가입 | T-020 |
| `pages/DocumentsPage.jsx`(골격 있음) · `pages/Documents.module.css`(새로 만듦) | 목록·탭·정렬·페이지·상태 넷 | T-021 |
| 같은 `DocumentsPage.jsx`·`Documents.module.css` + `hooks/useUpload.js`(골격 있음) · `hooks/useUpload.test.js`(새로 만듦) | 업로드·제목 수정·삭제 확인 | T-057 |
| `pages/AnalysesPage.jsx`(골격 있음) · `pages/Analyses.module.css` · `pages/AnalysesPage.test.jsx`(새로 만듦) | 분석 기록 | T-031 |
| `docs/6-Frontend개발명세서.md` §5.1·§6·§7 (+ §5.3 `useUpload` 행) | 6번 문서 내 절 | T-060 |
| `routes.js` · `App.jsx` | 있음 — 라우트 추가 금지(화면 5 고정 · SPEC §2) | T-009 |

`pages/analysis/` · `hooks/useChatStream.js` · `stores/chatStore.js` 는 FE-분석·기술 리드 파일 — 손대지 않는다(위 공용 파일 경계).

## 3. 티켓별 구현 명세

### T-009 프론트 골격을 받아 빌드·공용 테스트·목 연결을 확인한다 (D1 · 선행 T-001)

- **수정 허용**: `frontend/package.json` · `frontend/package-lock.json` · `frontend/src/api/` · `frontend/src/components/` · `frontend/src/styles/` · `frontend/src/routes.js` · `frontend/src/App.jsx`
- **수용 기준 요지**: `npm ci && npm run build` 성공 · `npx vitest run src/api` 22 passed(공용 9 + 세션·SSE 회귀 13) · `npm run dev` + `node mock/server.mjs`로 로그인 화면(TODO)이 뜬다 · `check-sec-deploy` · `check-scope T-009` 무출력
- **확인 명령**:
  ```bash
  cd frontend && npm ci && npm run build && npx vitest run src/api
  ```
- **구현 지침**:
  1. 위 명령 → 22 passed. `npx vitest run src/components`(ErrorMessage 5)도 같이 — CI 1단계가 둘 다 본다.
  2. `node mock/server.mjs` + `cd frontend && npm run dev` → `/login`이 뜬다(골격 "TODO" 문구면 정상). `VITE_API_URL=http://localhost:8080`은 `frontend/.env.development`에 이미 있다(SPEC §1 프론트 env).
  3. 커밋: `chore(fe): 프론트 골격 [T-009]`

알아 둘 API(`api/client.js` — 이미 있음 · 이번 주 기술 리드 회귀로 바뀐 동작 포함):

| export | 시그니처 | 동작 |
|---|---|---|
| `api.get` | `(path, opts?)` | 성공 봉투의 `data`만 반환 · 실패면 `ApiError` throw · 타임아웃 10초 |
| `api.post` · `api.put` | `(path, body, opts?)` | JSON 본문 · 10초 |
| `api.del` | `(path, opts?)` | 35초(서버가 AI 삭제를 기다린다) |
| `api.upload` | `(path, formData, opts?)` | multipart · Content-Type은 브라우저가 붙인다(직접 넣지 않는다) · 35초 |
| `ApiError` | `{ status, code, message, fields[] }` | `code`로 분기 · `fields`는 400 필드 오류 · 봉투 아닌 응답은 `FILE_TOO_LARGE`(413)/`NETWORK_ERROR` |
| `streamPost` | `(path, body, signal)` | FE-분석 전용 — `Response`를 그대로 반환 · 시작 전 봉투(403/404/400)는 `ApiError` |
| `BASE` | `import.meta.env.VITE_API_URL ?? ''` | 주소는 여기서만 읽는다(README 규칙 13) |

401·세션 규칙(SPEC §1 인증 행 · §4.4 · `session.test.js`가 고정):
- **요청 전**: Access가 없고 Refresh만 있으면(새로고침 직후) 먼저 refresh 1회로 Access를 복구한다 — 로그인·가입·refresh 경로는 제외.
- `TOKEN_EXPIRED`만 refresh 1회 후 재시도 — 동시 요청이어도 refresh는 한 번(탭 안 Promise 공유 · 탭 사이 `navigator.locks.request('jobgap-refresh')`).
- refresh 실패면 `authStore.clear()` 후 그 에러(`INVALID_REFRESH_TOKEN`)를 던진다 · 그 밖의 401은 `clear()`(로그인 API는 예외 — 실패 문구를 보여야 한다) → `Protected`가 `/login`으로 보낸다.
- `streamPost`도 같은 규칙: TOKEN_EXPIRED면 refresh 1회 후 재시도 · 그 밖 401이나 refresh 실패면 `clear()` · 403은 세션을 지킨다.
- fetch 예외: 사용자가 `signal`로 끊으면 `ABORTED`("요청을 취소했습니다") · 타임아웃·연결 실패는 `NETWORK_ERROR`.

`api/sse.js`: `createSseParser(onEvent)` — `\n\n` 프레임 · `event:`·`data:` 뒤 공백 0~1 · CRLF·단독 CR 허용 · **CR이 조각 끝에서 갈려도**(`\r` | `\n`) 한 줄바꿈으로 본다 · `decodeData(raw)` = token의 JSON 문자열 디코드.
`components/Layout.jsx`: 로그아웃 = `POST /api/auth/logout`(실패해도 진행) → `clear()` → `useChatStore.getState().reset()` → `/login`.
`components/ErrorMessage.jsx`: `messageFor(error)`가 코드별 문구 — 423 `ACCOUNT_LOCKED`만 서버 message에서 해제 시각(`HH:MM[:SS]`)을 뽑아 "…{시각}에 해제됩니다"로 보인다(SPEC §4.4 "해제 시각 표시" · 나머지는 서버 message를 쓰지 않는다 · F-7).

### T-020 로그인·회원가입 화면과 보호 라우트 (D2 · 선행 T-009)

- **수정 허용**: `frontend/src/pages/LoginPage.jsx` · `frontend/src/pages/RegisterPage.jsx` · `frontend/src/pages/Auth.module.css` · `frontend/src/pages/LoginPage.test.jsx`
- **수용 기준 요지**: 목으로 로그인 → `/documents` · 실패 문구 · 가입 400 `fields[]`를 필드 아래 · `seams/smoke.md` 1~2번 줄 · `check-sec-deploy` · `check-scope T-020` 무출력
- **확인 명령**:
  ```bash
  cd frontend && npm run build && npm test
  ```
- **구현 지침** (SPEC §4.1 · §4.4):

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
| 로그인 제출 | `api.post('/api/auth/login', {email, password})` → `{accessToken, refreshToken, user}` | `useAuthStore.getState().setSession(data)` → `navigate(ROUTES.DOCUMENTS)` | `INVALID_CREDENTIALS`·`ACCOUNT_LOCKED`·그 밖 전부 `messageFor(e)` — 423은 `messageFor`가 해제 시각만 붙인다(서버 `e.message`를 그대로 쓰지 않는다 · F-7) |
| 가입 제출 | `api.post('/api/auth/register', {email, password, name})` → `{uuid, email, name}` | `navigate(ROUTES.LOGIN)` + "가입되었습니다. 로그인하세요" | `VALIDATION_ERROR` → `e.fields`를 `field`별로 입력칸 아래 · `DUPLICATE_EMAIL` → 이메일 칸 아래 `messageFor(e)`("이미 가입된 이메일입니다") |

상태: 로딩 = 제출 중 버튼 `disabled` + 라벨 "로그인 중…" · 빈 = 해당 없음 · 에러 = 위 표 · 정상 = 폼.
클라이언트 검증(왕복 줄이기 · 정본은 서버 400): `type="email" required` · 비밀번호 `minLength={8} maxLength={64}` · 이름 `maxLength={20}`.
이미 로그인 상태(`refreshToken` 있음)로 `/login` 진입 → `<Navigate to={ROUTES.DOCUMENTS} replace />`. 보호 라우트(`App.jsx`의 `Protected`)는 이미 있다 — 고치지 않는다.
`LoginPage.test.jsx`(내 테스트 · MSW `server.use(http.post(`${API}/api/auth/login`, …))` — `API`·`ok`·`fail`은 `src/test/handlers.js`): 401 → 문구 보임 1 · 200 → 스토어에 refreshToken 1. `<MemoryRouter>`로 감싼다.
목에서 잠금 확인: kim@example.com으로 5회 틀리면 423(목은 60초 뒤 풀림) — 문구에 해제 시각이 보이면 정상.
커밋: `feat(fe): 로그인·회원가입 화면 [T-020]`

### T-021 내 문서 목록 — 탭·정렬·페이지·상태 넷 (D2 · 선행 T-009) — 판정 테스트 4

- **수정 허용**: `frontend/src/pages/DocumentsPage.jsx` · `frontend/src/pages/Documents.module.css` (업로드·수정·삭제는 T-057)
- **수용 기준 요지**: `src/pages/DocumentsPage.test.jsx` 4 green · 제목 텍스트 렌더(F-1) · `seams/smoke.md` 3번 줄 · `check-sec-deploy` · `check-scope T-021` 무출력
- **확인 명령**:
  ```bash
  cd frontend && npx vitest run src/pages/DocumentsPage.test.jsx
  ```
- **구현 지침** (SPEC §4.2 · §5):

컴포넌트 트리 (`pages/DocumentsPage.jsx` **한 파일 안**에서 함수로 나눈다 — 수정 허용이 이 파일·CSS뿐. `UploadForm`·행 버튼은 T-057에서 같은 파일에 더한다)
```
DocumentsPage
 ├ UploadForm   (T-057)
 ├ Toolbar      (탭: 전체/공고/이력서 · 정렬 select)
 ├ 상태 분기     LoadingSpinner | ErrorMessage(onRetry) | EmptyState | DocumentList
 │   └ DocumentRow × n  (제목 · 종류 · 글자 수 · 등록일 · [제목 수정] [삭제] ← T-057)
 └ Pager        (이전 · "1 / 3" · 다음)
```

상태 넷 (판정 테스트가 그대로 본다)

| 상태 | 조건 | 렌더 |
|---|---|---|
| 로딩 | 첫 요청 응답 전(첫 렌더부터 loading=true) | `<LoadingSpinner />` (`role="status"`) |
| 빈 | `data.content.length === 0` | `<EmptyState message="공고나 이력서를 올려 보세요" />` — 문구 한 글자도 바꾸지 않는다 |
| 에러 | `ApiError` | `<ErrorMessage error={e} onRetry={reload} />` — `role="alert"` · 서버 `message`를 그대로 붙이지 않는다(F-7) |
| 정상 | 목록 | 행마다 `{doc.title}` 텍스트 |

목록 API: `GET /api/documents?type=&page=&size=20&sort=` → `{content[]: {id,type,title,charCount,createdAt}, page{number,size,totalElements,totalPages,first,last,numberOfElements}}` · `type`·`sort` 허용 밖은 400(SPEC §4.2).

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

반응형 (`Documents.module.css` · 브레이크포인트 값은 `styles/tokens.css` 주석 — 768·1280)

| 폭 | 바뀌는 것 |
|---|---|
| < 768 (390) | 행 = 카드 세로 쌓기(제목 한 줄 · 종류·글자 수·날짜 둘째 줄 · 버튼 셋째 줄) · 업로드 폼 세로 · 탭 가로 스크롤 금지(줄바꿈) |
| 768~1279 | 표 형태 한 줄 · 업로드 폼 가로 |
| ≥ 1280 | `Layout`의 `--content-max` 안에서 여백만 커진다 |

색·간격은 `var(--color-*)`·`var(--space-*)`만(리터럴 금지 · ADR-07).
커밋: `feat(fe): 내 문서 목록·상태 넷 [T-021]`

### T-057 업로드(useUpload)·제목 수정·삭제 확인 (D2 · 선행 T-021 · D3 오전까지 넘어가도 된다)

- **수정 허용**: `frontend/src/hooks/useUpload.js` · `frontend/src/hooks/useUpload.test.js` · `frontend/src/pages/DocumentsPage.jsx` · `frontend/src/pages/Documents.module.css`
- **수용 기준 요지**: `useUpload` = `{ upload, uploading, error }` · 클라이언트 검증 .md/.txt·200KB(서버가 정본) · 삭제 확인 대화상자 · 수정 409 문구 · `seams/smoke.md` 4번 줄 · `check-sec-deploy` · `check-scope T-057` 무출력
- **확인 명령**:
  ```bash
  cd frontend && npm test
  ```
- **구현 지침** (SPEC §1 업로드 행 · §4.2 · §6.4):

| 동작 | 호출 | 성공 후 |
|---|---|---|
| 업로드 | `POST /api/documents` multipart `file`·`type`·`title` → 201 `DocumentSummary` | 첫 페이지 다시 조회 · 폼 비우기 |
| 제목 수정 | `PUT /api/documents/{id}` `{title}` → `DocumentSummary` | 그 행만 바꾸거나 다시 조회 |
| 삭제 | `DELETE /api/documents/{id}` → `null` | 다시 조회(마지막 행을 지워 빈 페이지면 `page-1`) |

에러 문구는 이미 `ErrorMessage`의 `BY_CODE`에 있다 — `DUPLICATE_TITLE`(409) "같은 제목의 문서가 있습니다" · `FILE_TOO_LARGE`(413) · `UNSUPPORTED_FILE`(415) · `VALIDATION_ERROR`(빈 파일 400) · `AI_UNAVAILABLE`(업로드·삭제 503 — `onRetry`로 재시도 버튼).
빠진 코드가 보이면 이 티켓에서 고치지 않는다(`components/`는 T-059 수정 허용).

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
화면에는 `messageFor(error)`(코드별 문구)를 보인다. 서버는 200KB~1MB도 봉투 413, 1MB 초과는 nginx HTML 413 → `client.js`가 `FILE_TOO_LARGE`로 바꾼다(SPEC §1 업로드 행).
`useUpload.test.js`(내 테스트 · `src/hooks/`에 두므로 FE-분석의 `npx vitest run src/hooks`에도 같이 돈다): `.exe` → `error.code === 'UNSUPPORTED_FILE'`이고 네트워크 호출 0 · 정상 → MSW 201 데이터 반환.

제목 인라인 수정 · 삭제 확인 (브라우저 `confirm()` 대신 행 안의 확인 상자 `role="alertdialog"` — 테스트·자동화가 막히지 않는다)
```jsx
function DocumentRow({ doc, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState(null);
  const save = async () => {
    try { onSaved(await api.put(`/api/documents/${doc.id}`, { title })); setEditing(false); }
    catch (e) { setErr(e); }                                  // DUPLICATE_TITLE(409) → 입력칸 아래 messageFor(e)
  };
  const remove = async () => {
    try { await api.del(`/api/documents/${doc.id}`); onDeleted(doc.id); }
    catch (e) { setErr(e); setConfirming(false); }            // AI_UNAVAILABLE(503)이면 문서는 그대로 남아 있다(SPEC §6.4)
  };
  // editing ? <input value={title} maxLength={100}/> + 저장/취소 : <span>{doc.title}</span>
  // confirming ? <div role="alertdialog">"삭제하면 이 문서를 쓴 분석도 지워집니다" + [삭제 확인] [취소]</div> : [삭제]
}
DocumentRow.propTypes = { doc: PropTypes.shape({ id: PropTypes.string.isRequired, title: PropTypes.string.isRequired }).isRequired,
  onSaved: PropTypes.func.isRequired, onDeleted: PropTypes.func.isRequired };
```
삭제 안내 문구의 근거: SPEC §6.4(문서를 지우면 그 문서를 posting·resume로 쓴 분석과 메시지도 지워진다).
확인: 목 서버로 `.md` 업로드 → 제목 수정 → 삭제 · `.exe`·300KB 시도(smoke 4번).
커밋: `feat(fe): 업로드·제목 수정·삭제 확인 [T-057]` — 테스트만 따로면 `test(fe): useUpload 검증 [T-057]`

### T-031 분석 기록 화면 (D3 · 선행 T-009)

- **수정 허용**: `frontend/src/pages/AnalysesPage.jsx` · `frontend/src/pages/Analyses.module.css` · `frontend/src/pages/AnalysesPage.test.jsx`
- **수용 기준 요지**: 상태 넷 · INCOMPLETE = "중단됨" · 클릭 → `ROUTES.analysis(id)` · `AnalysesPage.test.jsx` 1(내 테스트) · `seams/smoke.md` 7번 줄 · `check-sec-deploy` · `check-scope T-031` 무출력
- **확인 명령**:
  ```bash
  cd frontend && npm test
  ```
- **구현 지침** (SPEC §2 lastStatus 파생 · §4.3 목록):

| 상태 | 렌더 |
|---|---|
| 로딩 | `LoadingSpinner` |
| 빈 | `EmptyState message="아직 분석이 없습니다" action={<Link to={ROUTES.ANALYSIS_NEW}>새 분석</Link>}` |
| 에러 | `ErrorMessage onRetry` |
| 정상 | 행: `{title}` · `{createdAt}`(로컬 표시) · `메시지 {messageCount}` · `lastStatus === 'INCOMPLETE'`면 배지 "중단됨" · 행 클릭 → `navigate(ROUTES.analysis(id))` |

API: `GET /api/analyses?page=0&size=20` → `content[]: {id,title,postingTitle,resumeTitle,messageCount,lastStatus,createdAt}` + `page`(최신순 고정 — 정렬 UI 없음) · Pager는 T-021과 같은 방식.
목의 분석 `7`은 마지막 메시지가 USER라 `INCOMPLETE` — "중단됨" 배지를 눈으로 확인할 수 있다.
`AnalysesPage.test.jsx`(내 테스트): INCOMPLETE 행에 "중단됨" 1(여유가 있으면 빈 문구 1).
커밋: `feat(fe): 분석 기록 화면 [T-031]`

### T-059 공용 컴포넌트 재사용·PropTypes·에러 문구 점검 (D4 · 선행 T-021 · T-031)

- **수정 허용**: `frontend/src/components/` · `frontend/src/pages/*.jsx` (`pages/analysis/`는 포함되지 않는다 · 패턴상 `pages/DocumentsPage.test.jsx`도 걸리지만 판정 테스트라 고치지 않는다 · `components/ErrorMessage.test.jsx`도 같다)
- **수용 기준 요지**: 공용 3개 이상이 두 화면 이상에서 쓰임 · PropTypes 전부 · SPEC §4.4 코드 전부 `ErrorMessage` 문구 있음 · `check-sec-deploy` · `check-scope T-059` 무출력
- **확인 명령**:
  ```bash
  cd frontend && npm test && npm run build
  ```
- **구현 지침** (SPEC §4.4 · §5 · 평가표 R-FE01):
  1. 재사용 표 만들기 — `grep -rn "from '../components/\|from '../../components/" frontend/src/pages` 로 컴포넌트별 쓰는 화면을 센다. `Button`·`LoadingSpinner`·`EmptyState`·`ErrorMessage` 중 3개 이상이 2화면 이상이면 통과(결과 표는 T-060 §5.1에 옮긴다).
  2. PropTypes — `pages/*.jsx` 안 함수 컴포넌트(`DocumentRow` 등)까지 `X.propTypes =` 가 있는지. 분석 화면(`pages/analysis/`)은 FE-분석 파일 — 빠졌으면 FE-분석에게 알린다.
  3. 에러 문구 — SPEC §4.4 코드와 `BY_CODE`를 대조한다. 지금(D1 골격) 빠진 것: `TOKEN_EXPIRED`(보통 refresh가 삼키지만 재시도 뒤에도 오면 "다시 로그인해 주세요") · `NOT_FOUND`(§4.4 "목록으로") · `INTERNAL_SERVER_ERROR` —
     `INTERNAL_SERVER_ERROR`를 넣는다면 문구는 기본값과 같은 **"잠시 후 다시 시도해 주세요"**여야 한다(`ErrorMessage.test.jsx` 3번째가 이 문구를 본다).
  4. FE-분석이 요청한 문구가 있으면 같은 커밋에(요청 목록은 T-039 결과).
- 커밋: `refactor(fe): 공용 컴포넌트·에러 문구 점검 [T-059]`

### T-060 6번 문서 내 절(§5.1 공통 컴포넌트·§6 상태·§7 API 연동) (D5 · 선행 T-059)

- **수정 허용**: `docs/6-*`
- **수용 기준 요지**: 내 절 TODO 0 · `check-sec-deploy` · `check-scope T-060` 무출력
- **확인 명령**:
  ```bash
  grep -c 'TODO(' docs/6-*
  ```
  (파일 전체를 센다 — §8은 FE-분석(T-043), §9는 기술 리드 TODO라 내 절이 0이어도 0이 아닐 수 있다. 내 절은 `grep -n 'TODO(' docs/6-*`로 줄 번호를 보고 판단한다.)
- **구현 지침** — 6번 문서는 FE-분석이 파일 오너(리뷰), §5.1·§6·§7은 내 절(문서 머리말). 정본은 코드(`components/`·`stores/authStore.js`·`api/`):
  - §5.1: T-059 재사용 표(컴포넌트 × 쓰는 화면) · `Layout` 로그아웃 시 `chatStore.reset()` · `ErrorMessage` 최종 `BY_CODE` 코드 목록.
  - §6: `authStore`(Access 메모리 · Refresh·user만 persist) · `chatStore`는 FE-분석이 최종 모양을 알려 준다(내가 지어내지 않는다).
  - §7: 이번 주 바뀐 동작을 반영 — Access 없고 Refresh만 있으면 요청 전 refresh 1회 · `streamPost`의 401·refresh 실패 시 `clear()` · 사용자 중단 `ABORTED` / 타임아웃·연결 실패 `NETWORK_ERROR` · SSE 파서 CR·CRLF 조각 경계.
  - §5.3 `useUpload` 행(FE-분석 절 안의 내 행)도 실물(`{ upload, uploading, error }` · T-057)로 맞춘다 · "구현 예정 T-0xx" 표시는 구현된 것부터 지운다.
  - 같은 파일을 FE-분석(T-043)도 고친다 — 작업 전 `git pull origin feature/frontend`, 내 절만 고친다.
- 커밋: `docs(fe): 6번 공통 컴포넌트·상태·API 연동 [T-060]`

## 4. 받는 것 · 주는 것

| 무엇 | 누구에게서/에게 | 언제 |
|---|---|---|
| 목 서버·계약(SPEC §4) · 판정·회귀 테스트(`src/api`·`ErrorMessage`·`DocumentsPage`) | 기술 리드 → 나 | D1 |
| 실 API | 팀장(BE-인증 · auth D2 — T-015·T-058) · BE-기능(documents D2~D3 — T-014·T-024·T-055 · analyses D3 — T-056) → 나 | D2~D3 — 목과 같은 응답이면 코드 변경 0 |
| `api/client.js`(`api`·`streamPost`·`ApiError`) · `api/sse.js` · `components/` · `routes.js` · `styles/tokens.css` | 나 → FE-분석 | D1부터 · 위 공용 파일 경계대로 FE-분석은 고치지 않는다 — 필요한 것은 나에게 요청(예: `ErrorMessage` 문구 추가 → T-059) |
| `chatStore` 최종 모양(6번 §6에 옮길 것) | FE-분석 → 나 | D5 |
| compose(nginx 경유) | DevOps → 나 | D3 E2E(T-032) |
| 발표 슬라이드 원고(화면 시연) | 나 → 팀장 | D5 저녁 |

## 5. 일정 (`tasks/BOARD.md` · `tasks/ROADMAP.md`)

| 일 | 티켓 |
|---|---|
| D1 (11/5 목) | T-009 · 골든셋 문항 일부 작성해 AI에게(T-011 — FE 둘·DevOps가 나눠 보낸다) · T-003(저녁 SPEC 동결 회의 참석 · 팀장 진행) |
| D2 (11/6 금) | T-020 · T-021 · T-057(D3 오전까지 가능) |
| D3 (11/9 월) | T-031 · compose E2E(T-032) 클릭 확인 |
| D4 (11/10 화) | T-059 |
| D5 (11/11 수) | T-060 · EC2 클릭 경로(T-047 — 팀장 진행 · 전원) · 저녁 기능 동결 |
| D6 (11/12 목) | 버그픽스 · 리허설 참여 · 내 슬라이드(화면 시연) |

## 6. 막힐 곳

| 증상 | 원인 | 해결 |
|---|---|---|
| dev에서 모든 요청이 CORS 오류 | Vite가 5173이 아닌 포트로 뜸 · `VITE_API_URL` 없음 | `strictPort`라 포트 점유 프로세스 종료 · `frontend/.env.development`의 `VITE_API_URL=http://localhost:8080` 확인(목 CORS는 5173만 허용) |
| 새로고침하면 로그인 화면으로 | 요청 전 refresh가 실패(`INVALID_REFRESH_TOKEN` — 로그아웃·다른 기기 로그인 ADR-02·14일 만료) | 정상 동작 — 다시 로그인. Refresh가 살아 있는데도 튕기면 `session.test.js`부터 돌린다 |
| 업로드가 "200KB 이하 파일만…"인데 파일은 작다 | nginx HTML 413(1MB 초과) → `FILE_TOO_LARGE` | 클라이언트 200KB 검사로 미리 막힌다 — 우회됐으면 DevOps에 `client_max_body_size 1m` 확인 |
| 업로드·삭제가 "서버에 연결할 수 없습니다" | 35초 타임아웃(AI 적재·삭제 지연) 또는 연결 실패 | 백엔드·AI 로그 확인 — 타임아웃을 늘리지 말고 BE-기능에게 |
| 탭 "전체"인데 결과가 한 종류만 | 이전 탭의 `type`이 남음 | T-021 `listPath` — 전체면 키를 뺀다 |
| 정렬 바꾼 뒤 빈 화면 | page가 이전 값 그대로 | 탭·정렬 변경 시 page 0 |
| `DocumentsPage.test` 로딩 테스트만 red | 로딩 중 `LoadingSpinner`를 안 그림(초기 state가 null) | 첫 렌더부터 loading=true |
| 정상 테스트에서 img 요소가 생김 | 제목을 HTML로 렌더 | `{doc.title}` 텍스트로만 |
| `BY_CODE`를 고쳤더니 CI 1단계 red | `ErrorMessage.test.jsx`가 기본 문구·423 문구를 그대로 본다 | 문구는 테스트 기대값과 같게 · 테스트는 고치지 않는다 |
| `check-scope`가 FE-분석 파일까지 RED | 기준을 `origin/dev`로 돌렸다(공유 브랜치) | `node seams/check-scope.mjs <내 티켓> origin/feature/frontend` |

## 7. 내가 쓰는 문서

| 문서·절 | 정본 | 티켓 |
|---|---|---|
| `docs/6-Frontend개발명세서.md` §5.1 공통 컴포넌트 · §6 상태 관리 · §7 API 연동 (+ §5.3 `useUpload` 행) — 파일 오너 FE-분석 리뷰 · 내 절 = 내 커밋 | `components/` · `stores/authStore.js` · `api/client.js`·`api/sse.js` · `hooks/useUpload.js` | T-060 |

## 8. 코딩 에이전트에 맡길 때 (예: T-021)

```
너는 React 18 + Vite 프로젝트(frontend/)에서 일한다. 정본은 SPEC.md §4.2 · §5 (아래 붙임).
목표: src/pages/DocumentsPage.jsx 를 완성해 `npx vitest run src/pages/DocumentsPage.test.jsx` 4개를 green으로 만든다.
반드시 쓸 것: api/client.js 의 api.get · components/ 의 LoadingSpinner·EmptyState·ErrorMessage·Button · routes.js 의 ROUTES.
상태 넷: 로딩=LoadingSpinner(첫 렌더부터), 빈=EmptyState message="공고나 이력서를 올려 보세요"(문구 그대로), 에러=ErrorMessage(서버 message 노출 금지), 정상=목록.
목록 쿼리는 type이 없으면 키를 빼고, 탭·정렬이 바뀌면 page=0. 제목은 JSX 텍스트로만 렌더한다(HTML 주입 금지).
하위 컴포넌트는 같은 파일 안 함수로 만들고 PropTypes를 단다. 업로드·제목 수정·삭제는 이번 범위가 아니다(T-057).
수정 허용: src/pages/DocumentsPage.jsx · src/pages/Documents.module.css 만.
고치지 말 것: src/pages/DocumentsPage.test.jsx · src/api/ · src/components/ · src/test/ · 다른 화면. 색·간격은 styles/tokens.css 변수만.
끝나면 실행한 명령과 출력(테스트 결과)을 그대로 붙여라. commit은 하지 마라.
```

## 10. 내 티켓 전체 (최신 · `tasks/BOARD.md`의 FS 행 — 위 절과 번호가 다르면 이 표가 이긴다)

150줄 규칙으로 쪼갠 것: T-021 → T-021(목록·상태 넷) + **T-057**(업로드·수정·삭제) · 새 **T-059**(공용 컴포넌트 점검) · **T-060**(6번 내 절)

| 날 | 티켓 | 할 일 | 선행 | 확인 |
|---|---|---|---|---|
| D1 | [T-009](../tasks/T-009-frontend-skeleton.md) | 프론트 골격을 받아 빌드·공용 테스트·목 연결을 확인한다. | T-001 | `cd frontend && npm ci && npm run build && npx vitest run src/api` |
| D2 | [T-020](../tasks/T-020-login-pages.md) | 로그인·회원가입 화면과 보호 라우트. | T-009 | `cd frontend && npm run build && npm test` |
| D2 | [T-021](../tasks/T-021-documents-list.md) | 내 문서 목록 — 탭·정렬·페이지·상태 넷. | T-009 | `cd frontend && npx vitest run src/pages/DocumentsPage.test.jsx` |
| D2 | [T-057](../tasks/T-057-documents-write.md) | 업로드(useUpload)·제목 수정·삭제 확인. | T-021 | `cd frontend && npm test` |
| D3 | [T-031](../tasks/T-031-analyses-page.md) | 분석 기록 화면. | T-009 | `cd frontend && npm test` |
| D4 | [T-059](../tasks/T-059-fe-common-check.md) | 공용 컴포넌트 재사용·PropTypes·에러 문구 점검. | T-021 · T-031 | `cd frontend && npm test && npm run build` |
| D5 | [T-060](../tasks/T-060-docs6-common.md) | 6번 문서 내 절(§5.1 공통 컴포넌트·§6 상태·§7 API 연동). | T-059 | `grep -c 'TODO(' docs/6-*` |

매일 규칙: `onboarding/README.md` · git: `onboarding/GitHub규약.md` · 화면 눈 검사: `seams/smoke.md` · 하루 끝 3줄: `worklog/<내이름>/D#.md`
