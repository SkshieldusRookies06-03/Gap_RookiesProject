# JobGap — 취업 갭 분석 리포트

채용공고와 내 이력서를 올리면 요구 기술과 보유 기술의 차이를 근거와 함께 리포트로 스트리밍하고, 후속 질문을 이어 가는 서비스.
SK쉴더스 루키즈 6기 3차 미니 프로젝트 · 정본은 [SPEC.md](SPEC.md) · 일정·티켓은 [tasks/BOARD.md](tasks/BOARD.md).

## 지금 바로 (D1 · 목 서버)
```bash
node mock/server.mjs                                   # 백엔드 목 :8080  (kim@example.com / Passw0rd!)
node seams/check-api.mjs http://localhost:8080         # 계약 검사
cd ai-module && pip install "fastapi==0.115.*" "uvicorn==0.32.*" && AI_INTERNAL_TOKEN=dev-token uvicorn mock_app:app --port 8000
MOCK=1 AI_INTERNAL_TOKEN=dev-token node seams/check-ai.mjs http://127.0.0.1:8000
```

## 테스트
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d database   # BE 테스트용 DB (127.0.0.1:3306)
cd backend && ./mvnw test                     # 판정 테스트 — D5까지 red 일부는 정상(tasks/D1-SETUP.md §3)
cd frontend && npm test
cd ai-module && pytest -q                     # 키 없이 돈다
```

## 실행 (D3부터 · DevOps가 채운다)
1. `cp .env.example .env` 후 값 채우기
2. `docker compose up -d --build` → http://localhost
3. 디버깅: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`

## 팀
| 레인 | 이름 |
|---|---|
| 팀장 | |
| 기술 리드·보안 | |
| BE-인증 | |
| BE-기능 | |
| AI | |
| FE-분석 | |
| DevOps | |
