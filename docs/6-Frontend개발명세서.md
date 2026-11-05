# Frontend 개발 명세서

> 정본 기준 · 기준 커밋: (확정 시 기입) · v0.1 — scaffold-docs-p3 생성 2026-11-05 · 문서 오너: FE
> 절마다 FILL 주석이 가리키는 정본에서 발췌하고, 채운 절의 주석은 지운다. 쓸 게 없는 절은 "해당 없음 — 이유 한 줄".

## 1. 기술 스택

<!-- FILL ← 정본: `package.json` · 방법: 라벨마다 실제 버전(상태 관리 = Zustand) · 오너: FE -->

- **Framework**: 
- **언어**: 
- **라우팅**: 
- **상태 관리**: 
- **스타일링**: 
- **빌드**: 

## 2. 프로젝트 구조

<!-- FILL ← 정본: `find frontend/src -maxdepth 2` · 방법: 트리 + 폴더 한 줄 역할 · 오너: FE -->

## 3. 환경 설정

<!-- FILL ← 정본: `.env.example` · 빌드 인자 · 방법: `VITE_API_URL` 하나(로컬 `http://localhost:8080` · 배포 빌드 빈 문자열 = 같은 출처) + "키를 넣지 않는다" 한 줄(F-4) · 오너: FE -->

## 4. 주요 페이지

<!-- FILL ← 정본: `src/routes.js` · 화면 상태 계약 · 방법: 표: 페이지 · 컴포넌트 · 기능 · 보호 여부 · 화면 상태 네 가지(P3-0.2 화면 5) · 오너: FE -->

| 페이지 | 컴포넌트 | 기능 |
|--------|----------|------|

## 5. 컴포넌트

### 5.1 공통 컴포넌트

<!-- FILL ← 정본: `src/components/` · 방법: 표: 컴포넌트 · 쓰이는 화면(≥2) · Props(PropTypes) · 오너: FE -->

### 5.2 채팅 컴포넌트

<!-- FILL ← 정본: `src/pages/chat/` · `src/hooks/` · 방법: 계층 트리(Props·State 표기) · 오너: FE -->

### 5.3 커스텀 Hook

<!-- FILL ← 정본: `src/pages/chat/` · `src/hooks/` · 방법: 표(Hook · 반환값 · 쓰는 화면 · 책임) · 오너: FE -->

## 6. 상태 관리

<!-- FILL ← 정본: `src/store/*.js` · 방법: 스토어 2개 발췌 · authStore `persist` + `partialize`로 Refresh만 저장하고 Access는 메모리인 이유(F-2) · 오너: FE -->

## 7. API 연동

<!-- FILL ← 정본: `src/api/` · 방법: axios 인스턴스 · 인터셉터(봉투 해제 · 401→refresh(동시 401이면 한 번만 — 진행 중 Promise 공유)→재요청) · 스트림 함수는 fetch(이유 한 줄 · `data:` 뒤 공백 0~1 허용 파서) · 오너: FE -->

## 8. 주요 기능

<!-- FILL ← 정본: 화면 · 캡처 · 방법: 반응형 절(뷰포트 390·768·1280 + 캡처 3장 경로) · 업로드(드래그앤드롭·검증 안내) · 스트리밍 렌더링(토큰 누적·sources doc/web 구분·중단·error) · 로딩 · 오너: FE -->

## 9. 프론트엔드 보안

<!-- FILL ← 정본: 원장 F-1~F-7 · 방법: 라벨마다 실제 조치 한 줄 + 원장 행 ID · 오너: 보안 -->

- **XSS 방지**: 
- **토큰 저장**: 
- **토큰 만료 처리**: 
- **보호 라우트**: 
- **의존성 점검**: 
- **에러 노출**: 

## 10. 빌드 및 배포

<!-- FILL ← 정본: `package.json` scripts · 방법: 실제 scripts(test = vitest run) · 오너: FE -->

## 11. Docker 설정

<!-- FILL ← 정본: `frontend/Dockerfile` · `nginx.conf` · 방법: 멀티스테이지 발췌 · nginx(SPA fallback · /api 프록시 · 스트림 buffering off · CSP) · 오너: FE -->
