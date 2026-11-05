# T-004 — Maven wrapper를 넣고 백엔드를 처음 컴파일·기동한다

**담당:** 팀장(BE-인증) · **브랜치:** `feature/lead-T-004` · **예상:** D1 · **선행:** T-001

## [배경]
SPEC.md §1 BE 의존성 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
Maven wrapper를 넣고 백엔드를 처음 컴파일·기동한다.

## [수용 기준]
- [ ] start.spring.io(Maven · Java 17 · Boot 3.3.x)에서 `mvnw`·`mvnw.cmd`·`.mvn/`만 가져와 커밋
- [ ] `./mvnw test -Dtest='JobgapApplicationTests,PiiMaskerTest'` green (DB: dev compose `database`)
- [ ] 컴파일 에러는 출력 전체를 기술 리드에게
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-004` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `backend/mvnw` · `backend/mvnw.cmd` · `backend/.mvn/` · `backend/pom.xml`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-004]` · 전면 재작성 금지

## [확인 명령]
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d database
cd backend && ./mvnw test -Dtest='JobgapApplicationTests,PiiMaskerTest'
```
