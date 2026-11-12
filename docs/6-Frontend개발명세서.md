# Frontend 개발 명세서

> 정본 기준 · 기준 커밋: (확정 시 기입) · v0.1 — 2026-11-05 · 문서 오너: FE-분석(파일 리뷰) · §5.1·§6·§7은 FE-화면 · §9(보안 — npm audit 요약)는 FE-분석이 T-039 결과로 T-043에서 쓰고 기술 리드가 확인
> 정본: `frontend/` 코드 · `SPEC.md` §1·§4·§5. **"구현 예정 T-0xx"** 표시는 D1 골격 시점에 아직 없는 화면·컴포넌트 — 구현되면 표시를 지운다.

## 1. 기술 스택

- **Framework**: React 18.3.1 (react-dom 18.3.1)
- **언어**: JavaScript (JSX · ES 모듈) · PropTypes 15.8.1
- **라우팅**: react-router-dom 6.30.6 — 경로 문자열은 `src/routes.js` 한 곳
- **상태 관리**: Zustand 4.5.7 — `authStore`(persist) · `chatStore`
- **스타일링**: CSS Modules(`*.module.css`) + 토큰 1파일 `src/styles/tokens.css`(ADR-07) — 색·간격 리터럴 금지
- **빌드**: Vite 5.4.21 (포트 5173 `strictPort`) · 테스트 Vitest 2.1.9 + Testing Library 16 + MSW 2

## 2. 프로젝트 구조

```
frontend/src/
├── main.jsx · App.jsx     진입 · 라우터(보호 라우트 Protected)
├── routes.js              경로 상수(ROUTES)
├── api/                   client.js(fetch 래퍼·봉투·refresh·streamPost) · sse.js(SSE 파서)          — FE-화면
├── stores/                authStore.js(토큰·사용자) — FE-화면 · chatStore.js(분석 화면 상태) — FE-분석
├── hooks/                 useChatStream.js(스트림) — FE-분석 · useUpload.js(업로드) — FE-화면
├── components/            Button · Layout · LoadingSpinner · EmptyState · ErrorMessage (+ .module.css) — FE-화면
├── pages/                 LoginPage · RegisterPage · DocumentsPage · AnalysesPage — FE-화면
│   └── analysis/          AnalysisPage(+ DocumentPicker · MessageList · FollowUpForm 은 이 파일 안 함수) — FE-분석 · ReportText·SourceChips — 기술 리드(T-054)
├── styles/                tokens.css · global.css
└── test/                  setup.js · server.js · handlers.js (MSW — 네트워크만 가로챈다)
```

## 3. 환경 설정

| 변수 | 로컬 dev | 배포 빌드 |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080` (`frontend/.env.development`) | 빈 문자열(같은 출처 — `frontend/Dockerfile`의 `ENV VITE_API_URL=""`) |

`VITE_` 값은 번들에 문자열로 박히는 공개값이다 — **API 키·비밀값은 프론트 env에 넣지 않는다**(LLM·Tavily 키는 AI 서버에만 · 점검서 F-4). 코드가 `/api/...`를 붙이므로 `VITE_API_URL`에 `/api`를 넣지 않는다.

## 4. 주요 페이지

화면 5 고정(SPEC §5) · 전 화면 상태 넷(로딩 = `LoadingSpinner` · 빈 · 에러 = `ErrorMessage` · 정상).

| 페이지 | 컴포넌트 | 기능 |
|--------|----------|------|
| 로그인 `ROUTES.LOGIN` `/login` · 공개 | `LoginPage` (FE-화면) | 로그인 → `/documents` · 실패 문구(401·423) · 빈 상태 없음 |
| 회원가입 `ROUTES.REGISTER` `/register` · 공개 | `RegisterPage` (FE-화면) | 가입 · 400 `fields[]`를 필드 아래에 · 빈 상태 없음 |
| 내 문서 `ROUTES.DOCUMENTS` `/documents` · 보호 | `DocumentsPage` (FE-화면) | 타입 탭 · 정렬 · 페이지 · 업로드 · 제목 수정 · 삭제 · 빈 "공고나 이력서를 올려 보세요" |
| 분석 `ROUTES.ANALYSIS_NEW` `/analyses/new` · `ROUTES.ANALYSIS` `/analyses/:id` · 보호 | `AnalysisPage` (FE-분석) | 공고·이력서 선택 → 리포트 스트리밍 · 중단 · 출처 · 후속 질문 · 빈 "공고 1개와 이력서 1개를 고르세요" |
| 분석 기록 `ROUTES.ANALYSES` `/analyses` · 보호 | `AnalysesPage` (FE-화면) | 분석 목록 · `INCOMPLETE` = "중단됨" · 클릭 → `ROUTES.analysis(id)` · 빈 "아직 분석이 없습니다" |

보호 라우트(`App.jsx`의 `Protected`): Refresh 토큰이 없으면 `/login`으로 · 그 밖 경로는 `/documents`로.

## 5. 컴포넌트

### 5.1 공통 컴포넌트

공용 컴포넌트 4종 모두 2화면 이상에서 재사용된다(평가표 R-FE01 충족 · T-059).

| 컴포넌트 | 쓰이는 화면 (재사용 현황) | Props(PropTypes) |
|---|---|---|
| `Button` | 로그인 · 가입 · 내 문서 (3개 화면) | `children`(필수) · `variant` primary/secondary/danger · `type` button/submit · `disabled` · `onClick` |
| `Layout` | 보호 화면 전부(내 문서 · 분석 · 분석 기록, 3개 화면) | `children`(필수) — 상단 내비 · 사용자 이름 · 로그아웃(`POST /api/auth/logout` 시도 후 `clear()`, `useChatStore.getState().reset()` 호출) |
| `LoadingSpinner` | 내 문서 · 분석 기록 · 분석(“생성 중…”) (3개 화면) | `label`(기본 "불러오는 중…") · `role="status"` |
| `EmptyState` | 내 문서 · 분석 기록 · 분석 (3개 화면) | `message`(필수) · `action` |
| `ErrorMessage` | 전 화면 (로그인·가입은 `messageFor`, 내 문서·분석·분석기록은 컴포넌트) | `error`({code, message}) · `onRetry` — `messageFor(error)`로 코드별 사용자 문구(서버 message를 그대로 내지 않는다 · F-7 · 예외: 423은 message에서 해제 시각 `HH:MM[:SS]`만 뽑아 붙인다 — SPEC §4.4) |

`ErrorMessage` 최종 지원 에러 코드(`BY_CODE`):
- 인증/권한: `UNAUTHORIZED`("다시 로그인해 주세요"), `TOKEN_EXPIRED`("다시 로그인해 주세요"), `INVALID_CREDENTIALS`("이메일 또는 비밀번호가 올바르지 않습니다"), `INVALID_REFRESH_TOKEN`("다시 로그인해 주세요"), `FORBIDDEN`("접근 권한이 없습니다"), `ACCOUNT_LOCKED`("로그인 5회 실패로 잠겼습니다... {시각}에 해제됩니다")
- 리소스/요청: `DOCUMENT_NOT_FOUND`("문서를 찾을 수 없습니다"), `ANALYSIS_NOT_FOUND`("분석을 찾을 수 없습니다"), `NOT_FOUND`("목록으로"), `DOCUMENT_TYPE_MISMATCH`("공고와 이력서를 각각 골라 주세요"), `VALIDATION_ERROR`("입력값을 확인해 주세요"), `DUPLICATE_EMAIL`("이미 가입된 이메일입니다"), `DUPLICATE_TITLE`("같은 제목의 문서가 있습니다")
- 파일/서버: `FILE_TOO_LARGE`("200KB 이하 파일만 올릴 수 있습니다"), `UNSUPPORTED_FILE`(".md 또는 .txt(UTF-8) 파일만 올릴 수 있습니다"), `INTERNAL_SERVER_ERROR`("잠시 후 다시 시도해 주세요"), `AI_UNAVAILABLE`("분석 서버가 응답하지 않습니다")
- 네트워크/클라이언트: `NETWORK_ERROR`("서버에 연결할 수 없습니다"), `ABORTED`("요청을 취소했습니다")

### 5.2 채팅 컴포넌트

분석 화면 계층(FE-분석):
```
AnalysisPage                    state: useChatStream() → {messages, streaming, error, analysisId}
├── DocumentPicker              props: onStart({postingId, resumeId}), disabled=streaming — 공고·이력서 목록은 안에서 불러온다 · /analyses/new에서만
├── MessageList                 props: messages[] (USER는 텍스트 white-space: pre-wrap)
│   ├── ReportText              props: text — ASSISTANT 응답. 제목·표·목록만 React 요소로 만들고 나머지는 텍스트(SPEC §5 · 기술 리드 T-054)
│   └── SourceChips             props: sources[] (type doc → 문서 제목 · web → 새 탭 링크 rel="noopener noreferrer" ·
│                                 url이 http:/https:가 아니면 링크 대신 텍스트 — javascript: 차단, dev엔 CSP가 없다)
├── LoadingSpinner "생성 중…" + Button "중단"(stop)   — streaming일 때
├── ErrorMessage                props: error · onRetry
└── FollowUpForm                props: onSubmit(question) · 1~1000자 — streaming이 아니고 대화가 있을 때만 렌더
```

### 5.3 커스텀 Hook

| Hook | 반환값 | 쓰는 화면 | 책임 |
|---|---|---|---|
| `useChatStream()` | `{ messages, streaming, error, analysisId, start, stop, hydrate, reset }` | 분석 | `start({postingId,resumeId})` 새 분석 / `start({analysisId,question})` 후속 · `streamPost` + `getReader()` + `createSseParser` · 이벤트별 갱신(analysis → id · token 누적 · sources · error) · 스트림이 닫히면(done 뒤) streaming 해제 · `stop()` = AbortController · `hydrate(messages, id?)` = 지난 대화 채우기(id가 있으면 analysisId도) · `reset()` = 진행 중 스트림 중단 후 상태 비우기 (판정: `useChatStream.test.jsx`) |
| `useUpload()` | `{ upload, uploading, error }` | 내 문서 | `upload({file,type,title})` → `DocumentSummary` · 클라이언트 사전 검증(.md/.txt · 200KB) 후 `api.upload` |

## 6. 상태 관리

```js
// stores/authStore.js
export const useAuthStore = create(persist(
  (set) => ({ accessToken: null, refreshToken: null, user: null,
              setSession: ({ accessToken, refreshToken, user }) => set((s) => ({ accessToken, refreshToken, user: user ?? s.user })),
              clear: () => set({ accessToken: null, refreshToken: null, user: null }) }),
  { name: 'jobgap-auth', partialize: (s) => ({ refreshToken: s.refreshToken, user: s.user }) }));

// stores/chatStore.js — 지금 보고 있는 분석의 화면 상태(서버 데이터 사본 아님)
export const useChatStore = create((set) => ({ analysisId: null, messages: [], setAnalysisId, setMessages, reset }));
```
- **Access 토큰**: 메모리에만 보관하여 XSS 시 저장소 탈취 방지(F-2).
- **Refresh 토큰**: `localStorage`(`partialize`)에 영속화. 새로고침 직후(Access가 없고 Refresh만 있을 때) 로그인·가입·refresh를 제외한 일반 API 요청 직전에 refresh 1회를 자동 호출하여 세션을 복구한다.
- **로그아웃/초기화**: `Layout`에서 로그아웃 시 `POST /api/auth/logout` 시도 후 `authStore.clear()` 및 `useChatStore.getState().reset()`을 호출하여 세션과 화면 상태를 비운다.

## 7. API 연동

`src/api/client.js` — axios 대신 `fetch` 래퍼 하나(모든 HTTP 호출은 여기를 지난다):
- 성공 봉투를 벗겨 `data`만 반환 · `success:false`면 `ApiError(status·code·message·fields)`로 reject · 봉투가 아닌 응답(nginx HTML 413 등)도 `ApiError`(`FILE_TOO_LARGE`)
- **새로고침 직후 세션 복구**: Access가 없고 Refresh만 존재하면 일반 요청 직전에 refresh 1회를 먼저 수행하여 Access를 복원한다(로그인·가입·refresh 경로는 제외).
- **401 및 토큰 갱신**: `TOKEN_EXPIRED`(401)만 refresh 1회 후 재요청 — 동시 요청이어도 refresh는 한 번만 수행: 탭 안은 진행 중 Promise 공유, 탭 사이는 `navigator.locks.request('jobgap-refresh')` 안에서 localStorage를 다시 읽고 그 Refresh로 요청(회전된 옛 값 재사용 방지) · refresh 실패나 그 밖 401이면 `authStore.clear()`.
- **예외 매핑**: 사용자가 `signal`로 취소하면 `ABORTED`("요청을 취소했습니다") · 타임아웃 및 네트워크 연결 실패는 `NETWORK_ERROR`("서버에 연결할 수 없습니다").
- **타임아웃**: 일반 10초 · 업로드·삭제 35초(서버가 AI 적재·삭제를 기다린다).
- `streamPost(path, body, signal)`: 스트림은 `fetch` + `ReadableStream`(이유: `EventSource`는 POST·`Authorization` 헤더를 못 보낸다) · `Response`를 그대로 반환하고, 시작 전 검증 실패(403/404/400 JSON 봉투)는 `ApiError`로 던짐 · `TOKEN_EXPIRED`면 refresh 1회 후 재시도하며, 401이나 refresh 실패 시 `clear()`, 403은 세션 유지.

`src/api/sse.js` — `createSseParser(onEvent)`: 조각을 버퍼에 모아 `\n\n` 프레임 단위 처리 · `event:`·`data:` 뒤 공백 0~1개 허용(Spring은 공백 없이 쓴다) · CRLF 및 단독 CR 허용 · **CR이 조각 끝에서 갈려도**(`\r` | `\n`) 한 줄바꿈으로 처리 · `decodeData()`로 token의 JSON 문자열을 원문으로(판정: `sse.test.js` · `client.test.js` · `session.test.js`).

## 8. 주요 기능

- **반응형**: 브레이크포인트 768px · 1280px(`tokens.css`에 값 · `@media`에 같은 숫자) · 뷰포트 390·768·1280에서 분석 화면 확인
  - 분석 화면(`Analysis.module.css`): 기본(<768) 공고·이력서 선택창이 세로 · 768↑ 두 칸(`.fields` 1fr 1fr)에 "분석 시작"은 오른쪽 아래(`.actions`) · 카드 여백 768↑ `--space-6` · 콘텐츠 폭은 `Layout` `.main`(`--content-max`)을 그대로 쓴다(내 문서·분석 기록과 같은 폭·왼쪽 기준) · 글자는 FS 화면과 같은 값(페이지 제목 24/700/32 · 설명 13/400/20 · 카드 제목 17/700/26 · 라벨 13/500/20) · 분석 화면 버튼(분석 시작·보내기·중단)은 공용 `Button`을 그대로 쓰고 `Analysis.module.css`에서만 높이 44px · 15/500/24로 맞춘다. `Layout`은 768↑ `--space-6` · 1280↑ `--space-8` 여백 · 767 이하 내비 `order: 3`
  - 캡처(분석 결과 — `/analyses/new`에서 공고·이력서 선택 → 분석 시작 → `done` 뒤 `/analyses/{id}`): `docs/img/analysis-390.png` · `docs/img/analysis-768.png` · `docs/img/analysis-1280.png`
  - 보조 캡처(시작 전 선택 화면 `/analyses/new`): `docs/img/analysis-new-390.png` · `docs/img/analysis-new-768.png` · `docs/img/analysis-new-1280.png`
  - 캡처 환경: 기준 커밋 `39faba5` · 목(`node mock/server.mjs`) + `npm run dev` · headless Chrome 뷰포트 390×844 · 768×1024 · 1280×800 (2026-11-12). 세 너비 모두 `scrollWidth` = 뷰포트 폭(가로 스크롤 0) · 콘솔 에러 0 · 표가 표로 · 출처 칩 문서/웹 구분
- **업로드**: 파일 선택(드래그앤드롭 선택) · 형식(.md/.txt)·크기(200KB) 안내와 클라이언트 검증 — 서버 검증이 정본(F-6) · 409·413·415는 `ErrorMessage` 문구
- **스트리밍 렌더링**: `streamPost` → `res.body.getReader()` + `TextDecoder({stream:true})` → `createSseParser`로 프레임 → `token`을 마지막 ASSISTANT 메시지에 누적 · `sources`는 문서/웹 칩으로 구분 · `done`이면 생성 중 해제 · `error`면 `ErrorMessage` + 재시도 · 중단 버튼은 `AbortController`(부분 답변은 화면에만, 서버 저장 없음). AI 응답은 **텍스트로 렌더**(`dangerouslySetInnerHTML` 금지 — F-1).
- **로딩**: 목록 첫 렌더부터 `LoadingSpinner` · 스트리밍 중 "생성 중…" + 중단 버튼

## 9. 프론트엔드 보안

- **XSS 방지**: 제목·질문·AI 응답 전부 JSX 텍스트 렌더(HTML 주입 API 미사용) · nginx CSP `default-src 'self'` · 판정 `DocumentsPage.test.jsx` 정상 케이스가 `<img onerror>` 제목을 텍스트로 확인 — F-1
- **토큰 저장**: Access 메모리 · Refresh만 localStorage(`partialize`) — F-2
- **토큰 만료 처리**: `TOKEN_EXPIRED`만 refresh 1회(탭 안·탭 사이 단일 비행) · 실패 시 세션 비우고 로그인으로 — F-3
- **보호 라우트**: `App.jsx` `Protected`가 Refresh 없으면 `/login` · 서버가 최종 판정(401/403) — F-3
- **의존성 점검**: `npm audit --json > security/evidence/npm-audit.json` — F-5
  - 결과(T-039 · `security/evidence/npm-audit.json` · fix 미실행): **High 이상 0건** — critical 0 · high 0 · moderate 0 · low 0 · info 0 · 의존성 280 → F-5 PASS
- **에러 노출**: 서버 message 대신 `ErrorMessage.messageFor(code)` 사용자 문구 · 500은 "잠시 후 다시 시도해 주세요" — F-7

## 10. 빌드 및 배포

```json
"scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview", "test": "vitest run" }
```
`npm ci`(package-lock 정본) → `npm run build` → `dist/` · `npm test`(판정 + 각자 테스트).

## 11. Docker 설정

`frontend/Dockerfile`(빌드 컨텍스트 = 리포 루트):
```dockerfile
FROM node:20.18-alpine AS build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=""
RUN npm run build
FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
```
`nginx/default.conf`: SPA fallback(`try_files $uri /index.html`) · `/api/` 프록시(`resolver 127.0.0.11` + `$backend` — 백엔드만 재생성해도 502 없음) · 스트림 `location = /api/analyses/stream`은 `proxy_buffering off` · `proxy_read_timeout 310s` · `client_max_body_size 1m` · CSP `default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'` · 외부 공개 포트는 80 하나.
