# 스파이크② — SSE 중계 (T-006)

- 일시: 2026-11-10 · 환경: macOS · JDK 17(IntelliJ 실행) · Spring Boot WebClient `bodyToFlux(ServerSentEvent)` · AI 목 `mock_app.py`(토큰 0.1초 간격 · `AI_INTERNAL_TOKEN=dev-token`)
- 명령: `curl -sN -X POST localhost:8080/api/analyses/stream -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"postingId":"672","resumeId":"379"}'` (perl로 줄마다 도착 시각을 붙임)
- 출력(발췌 · 도착 시각): `12.169 analysis{"analysisId":"304"}` → `12.246 token` → `12.334 token` → `12.437 token` → `12.539 token` → `12.640 token` → `12.742 sources` → `12.771 done{"messageId":"662"}` (14:38 기준 초)
- 결론: **성공** — 토큰이 77~103ms 간격으로 하나씩 도착(버퍼링 없음) · 순서 analysis → token×5 → sources → done · AI의 done을 가로채 ASSISTANT 저장 후 done{messageId}(sources→done 29ms) · 전환안(P3-6) 불필요.
- 비고: D1 임시 스파이크 코드 대신 T-025 `AiClient.analyze` 실코드로 같은 구성(FastAPI 목 → Spring WebClient → curl)을 재현해 기록했다(스파이크 코드는 머지하지 않음 · 원본 출력 24줄). RestClient로 받으면 끝까지 버퍼링되므로 WebClient를 유지한다. nginx 경유(`proxy_buffering off`)는 DevOps T-032에서 확인.
