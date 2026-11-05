# T-008 — 스파이크③: EC2 + Docker + nginx Hello 외부 접속 · 인스턴스 타입 결정

**담당:** DevOps · **브랜치:** `feature/devops-T-008` · **예상:** D1 · **선행:** —

## [배경]
SPEC.md 스킬 P3-5 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
스파이크③: EC2 + Docker + nginx Hello 외부 접속 · 인스턴스 타입 결정.

## [수용 기준]
- [ ] `docs/spikes/ec2.md`: 인스턴스 타입(1GB 금지) · 보안그룹(80 전체·22 내 IP) · 외부 `curl -I` 200 캡처
- [ ] temurin jre 이미지 curl 유무 기록
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-008` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `docs/spikes/` · `deploy/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-008]` · 전면 재작성 금지

## [확인 명령]
```bash
curl -I http://<EC2>/
```
