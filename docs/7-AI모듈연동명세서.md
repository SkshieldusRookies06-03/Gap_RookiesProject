# AI 모듈 연동 명세서

> 정본 기준 · 기준 커밋: (확정 시 기입) · v0.1 — scaffold-docs-p3 생성 2026-11-05 · 문서 오너: AI
> 절마다 FILL 주석이 가리키는 정본에서 발췌하고, 채운 절의 주석은 지운다. 쓸 게 없는 절은 "해당 없음 — 이유 한 줄".

## 1. 기술 스택

<!-- FILL ← 정본: `requirements.txt` · 방법: 라벨마다 실제(LLM·임베딩 모델명 정확히 · LangGraph · Tavily · LangSmith 썼으면) · 오너: AI -->

- **AI Framework**: 
- **API 서버**: 
- **Vector DB**: 
- **LLM**: 
- **관측**: 

## 2. 프로젝트 구조

<!-- FILL ← 정본: `ai-module/` 트리 · 방법: 트리 + 한 줄 역할 · 오너: AI -->

## 3. 환경 설정

<!-- FILL ← 정본: `.env.example` · 방법: AI 키 이름(값 없음) · AI_INTERNAL_TOKEN · RDB 접속값이 없는 이유 한 줄(P3-3 3번) · 오너: AI -->

## 4. 주요 API

<!-- FILL ← 정본: P3-3 AI 내부 계약 · 방법: 외부 비공개 문장 + 내부 토큰 헤더 · 오너: AI -->

### 4.1 질의 스트림 POST /internal/chat/stream

<!-- FILL ← 정본: `SPEC.md` AI 내부 계약 · 방법: 요청 JSON(ownerUuid·sessionId 포함) · SSE 이벤트 예시(token data = JSON 문자열) · 401 · 오너: AI -->

### 4.2 문서 적재 POST /internal/ingest

<!-- FILL ← 정본: `SPEC.md` AI 내부 계약 · 방법: 요청(파일·ownerUuid·documentId) · 응답(청크 수) · 401 · 오너: AI -->

### 4.3 문서 삭제 DELETE /internal/documents/{id}

<!-- FILL ← 정본: `SPEC.md` AI 내부 계약 · 코드 · 방법: ownerUuid 확인 · 없는 문서도 204(멱등) · 401 · 오너: AI -->

### 4.4 헬스체크 GET /health

<!-- FILL ← 정본: `SPEC.md` AI 내부 계약 · 코드 · 방법: 응답 · 내부 토큰 예외 · HEALTHCHECK 명령(python urllib) · 오너: AI -->

## 5. RAG 시스템

<!-- FILL ← 정본: LangGraph 그래프 코드 · 방법: Mermaid 흐름도(retrieve→grade→web_search→generate) + `add_node`/`add_conditional_edges` 코드 병기 · 오너: AI -->

### 5.1 문서 처리

<!-- FILL ← 정본: 적재 코드 · 방법: 단계마다 실제 클래스·파라미터(로더 · `RecursiveCharacterTextSplitter(chunk_size, chunk_overlap)` · 임베딩 · 벡터스토어 · owner 메타데이터) · 오너: AI -->

### 5.2 질의응답

<!-- FILL ← 정본: 그래프 노드 코드 · 방법: retriever(`similarity_search_with_relevance_scores` · k · owner 필터) → grade 기준값(SPEC 표) → Tavily 조건 → 프롬프트(system/human 분리) → 생성 · sources type doc/web · 오너: AI -->

## 6. 벡터 DB 설정

<!-- FILL ← 정본: 실측 · 방법: 인덱스·임베딩 모델·차원(실측)·청크·오버랩 실제 값(템플릿 값은 예시) · 오너: AI -->

- **FAISS 인덱스**: 
- **임베딩 모델**: 
- **청크 크기**: 
- **오버랩**: 

## 7. Backend 연동

<!-- FILL ← 정본: P3-3 · 방법: X-Internal-Token · 타임아웃 · SSE 이벤트 형식 · AI는 백엔드를 되부르지 않음 · 오너: AI -->

## 8. 지원 파일 형식

<!-- FILL ← 정본: BE 업로드 화이트리스트 · 방법: 5번 §7과 같은 목록 · 로더 대응 · 오너: AI -->

## 9. AI 보안

<!-- FILL ← 정본: 원장 A-1~A-5 · 방법: 라벨마다 실제 조치 + 원장 행 ID · Prompt Injection 재현 1건 요약 · 오너: 보안 -->

- **Prompt Injection 대응**: 
- **데이터 격리**: 
- **비용·자원 보호**: 
- **키 관리**: 

## 10. 테스트

<!-- FILL ← 정본: `tests/` · `eval/result.md` · 방법: pytest(401·owner 필터) + 골든셋 세 조건 결과 표(LLM 단독 / +RAG / +RAG+Tavily) · 오너: AI -->

## 11. 배포

<!-- FILL ← 정본: `ai-module/Dockerfile` · 방법: slim 이미지 · 비root · HEALTHCHECK · 인덱스 볼륨 · 오너: AI -->
