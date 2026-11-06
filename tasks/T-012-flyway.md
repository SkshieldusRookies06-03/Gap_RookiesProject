# T-012 — Flyway V1·V2를 빈 DB에서 적용하고 시드 시각 오프셋을 관측한다

**담당:** BE-기능 · **브랜치:** `feature/backend` · **예상:** D2 · **선행:** T-004

## [배경]
SPEC.md §2 · 시드 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
Flyway V1·V2를 빈 DB에서 적용하고 시드 시각 오프셋을 관측한다.

## [수용 기준]
- [ ] 빈 DB(볼륨 삭제) 기동 green
- [ ] `BoundaryAcceptanceTest` `timesAreKst` green(T-014와 함께 — createdAt이 `+09:00`)
- [ ] 시드 응답 시각 `+09:00` 관측 결과를 SPEC §1 표 옆에(SPEC PR)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-012` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/src/main/resources/db/migration/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-012]` · 전면 재작성 금지
- 참고: 적용된 V 파일은 고치지 않는다 — V3 추가

## [확인 명령]
```bash
cd backend && ./mvnw test -Dtest='JobgapApplicationTests,BoundaryAcceptanceTest#timesAreKst'
```
