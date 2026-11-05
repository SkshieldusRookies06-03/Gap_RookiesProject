# 역할 시트 — AI

> 정본은 `SPEC.md`. 이 시트는 요약이다 — 다르면 SPEC이 이긴다. 티켓 지시서는 `tasks/T-###-*.md`.

## 0. 내 판정 테스트 (지금 red인 것이 내 일이다)
`ai-module/tests/` 7 (2 green · 5 red → T-018 · T-019)

## 1. 한 줄
FastAPI·RAG·LangGraph 분기·Tavily·골든셋 평가 — AI 20점을 혼자 책임진다.

## 2. 내 파일 / 안 건드리는 파일
- 소유: `ai-module/`(Dockerfile 제외) · `docs/7-*` · `docs/3-*` 4절
- 안 건드림: `backend/` · `frontend/` · `ai-module/tests/`(기술 리드 판정)
- 공용 파일을 고쳐야 하면 그 오너에게 티켓으로 넘긴다 (`node seams/check-scope.mjs <티켓>`이 잡는다)

## 3. 내 계약 상대
생산: AI 내부 4(SPEC §6) → BE-기능 · 목 `mock_app.py`도 내 파일(계약 바뀌면 기술 리드 리뷰)

## 4. 내 티켓 순서
T-007(스파이크①) → T-011(골든셋 데이터) → T-018 → T-019 → T-029 → T-035 → T-036(A-2) → T-046(7번 문서)

## 5. 내가 쓰는 문서 (내 절 = 내 커밋)
7번 AI 모듈 연동 명세서(LangGraph 흐름도 + 코드 · 세 조건 표) · 3번 4절(벡터 저장)

## 6. 내 명령어
```bash
cd ai-module && pytest -q   # 키 없이 돈다(LLM_PROVIDER=fake)
AI_INTERNAL_TOKEN=dev-token LLM_PROVIDER=openai uvicorn app.main:app --port 8000
AI_INTERNAL_TOKEN=dev-token node seams/check-ai.mjs http://127.0.0.1:8000
```

## 7. 막힐 곳
- `add_node` ValueError → 노드 이름이 상태 키와 같다(web → web_search)
- 점수 방향 → relevance_scores는 0~1 높을수록 유사 · with_score는 거리(반대)
- 임베딩 모델을 바꾸면 기존 인덱스가 깨진다 → 볼륨 삭제 후 SeedIngestRunner
- owner 필터를 한 곳이라도 빠뜨리면 A-3 발견 — 검색·로드·삭제 전부 where에 owner_uuid

## 8. 발표에서 내가 말하는 한 문장
"같은 질문을 LLM 단독·RAG·RAG+웹 세 조건으로 돌려 정답 수를 셌다 — 숫자는 eval/result.md 그대로다."

## 9. 매일
아침: 그날 티켓 확인 · 저녁: 내 PR 머지 + `node scripts/check-sec-deploy.mjs` 무출력 + 1커밋 이상(개인 평가) · 막히면 30분 안에 채널에.
