# T-006 — 스파이크②: FastAPI 토큰 3개 → Spring WebClient 중계 → curl에 시간 간격을 두고 보인다

**담당:** BE-기능 · **브랜치:** `feature/backend` · **예상:** D1 · **선행:** —

## [배경]
SPEC.md §6.2 · §4.3 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
스파이크②: FastAPI 토큰 3개 → Spring WebClient 중계 → curl에 시간 간격을 두고 보인다.

## [수용 기준]
- [ ] `docs/spikes/sse-relay.md`에 명령·출력·결론 5줄(성공/실패와 전환안)
- [ ] 스파이크 코드는 머지하지 않는다(브랜치에만)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-006` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `docs/spikes/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-006]` · 전면 재작성 금지
- 참고: 실패하면 스킬 P3-6 전환표: D2 오전 AI와 짝 2시간

## [확인 명령]
```bash
curl -sN -X POST localhost:8080/<스파이크 경로>
```
