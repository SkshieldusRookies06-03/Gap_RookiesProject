# T-012 — Flyway V1(테이블 4)·V2(시드)를 커밋하고 빈 DB에서 기동한다

**담당:** BE-기능 · **브랜치:** `feature/be-feature-T-012` · **예상:** D2 · **선행:** T-004

## [배경]
SPEC.md §2 범위 세트 · 시드 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
Flyway V1(테이블 4)·V2(시드)를 커밋하고 빈 DB에서 기동한다.

## [수용 기준]
- [ ] 팩의 `V1__schema.sql`·`V2__seed.sql` 검토 후 커밋(바꿀 게 있으면 SPEC §2 PR 먼저)
- [ ] 빈 DB(볼륨 삭제) 기동 green · `ddl-auto: validate`
- [ ] 시드 시각이 응답에서 `+09:00`(관측 1회 · SPEC §1 표 옆에 결과)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-012` 무출력

## [제약]
- 수정 허용: `backend/src/main/resources/db/migration/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-012]`
- 참고: 적용된 V 파일은 고치지 않는다(체크섬). 바꾸려면 D3 전에는 볼륨을 지우고, 그 뒤에는 V3__…

## [확인 명령]
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d database
cd backend && ./mvnw test -Dtest=JobgapApplicationTests
```
