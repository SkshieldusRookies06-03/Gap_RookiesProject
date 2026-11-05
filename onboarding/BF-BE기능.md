# 역할 시트 — BE-기능

> 정본은 `SPEC.md`. 이 시트는 요약이다 — 다르면 SPEC이 이긴다. 티켓 지시서는 `tasks/T-###-*.md`.

## 0. 내 판정 테스트 (지금 red인 것이 내 일이다)
`DocumentAcceptanceTest` 7 · `AnalysisAcceptanceTest` 6 (red → T-014·T-024·T-025·T-026)

## 1. 한 줄
문서·분석 도메인, Flyway, AI 클라이언트, **SSE 중계**를 맡는다 — 팀에서 가장 어려운 사슬의 가운데.

## 2. 내 파일 / 안 건드리는 파일
- 소유: `backend/`(넓은 경로) · `document/` · `analysis/` · `ai/` · `db/migration/` · `docs/3-*` · `docs/4-*`
- 안 건드림: `auth/`·`user/`·`seed/`(BE-인증) · `common/`·`security/`(기술 리드) · 판정 테스트
- 공용 파일을 고쳐야 하면 그 오너에게 티켓으로 넘긴다 (`node seams/check-scope.mjs <티켓>`이 잡는다)

## 3. 내 계약 상대
생산: `/api/documents/**`·`/api/analyses/**`(SPEC §4.2·4.3) → 프론트 · 소비: AI 내부 4(SPEC §6) — 목 `uvicorn mock_app:app`

## 4. 내 티켓 순서
T-006(스파이크②) → T-012 → T-013 → T-014 → T-024 → T-025 → T-026(S-01) → T-038 → T-045(3·4번 문서)

## 5. 내가 쓰는 문서 (내 절 = 내 커밋)
3번 DB 설계서(4절은 AI) · 4번 API 설계서

## 6. 내 명령어
```bash
cd ai-module && AI_INTERNAL_TOKEN=dev-token uvicorn mock_app:app --port 8000   # AI 목
cd backend && ./mvnw test -Dtest='DocumentAcceptanceTest,AnalysisAcceptanceTest'
curl -sN -X POST localhost:8080/api/analyses/stream -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"postingId":"1","resumeId":"2"}'
```

## 7. 막힐 곳
- 스트림이 한꺼번에 도착 → nginx buffering(DevOps) 또는 RestClient로 받았음(WebClient bodyToFlux여야)
- 스트림 끝에 401/AccessDenied 로그 → ASYNC dispatch permitAll(이미 있음) · 30초에 끊김 → async timeout 300s(이미 있음)
- 삭제 500 → 분석이 문서를 FK로 잡고 있다 — 순서 §6.4
- `Sort.by(입력)` 500 → PageRequests.documentSort()
- token data를 다시 JSON 인코딩하면 이중 따옴표 — AI가 준 문자열 그대로 중계

## 8. 발표에서 내가 말하는 한 문장
"AI의 스트림을 끊김 없이 화면까지 중계하고, 끝나면 그때 저장한다 — 중단된 답변은 남기지 않는다."

## 9. 매일
아침: 그날 티켓 확인 · 저녁: 내 PR 머지 + `node scripts/check-sec-deploy.mjs` 무출력 + 1커밋 이상(개인 평가) · 막히면 30분 안에 채널에.
