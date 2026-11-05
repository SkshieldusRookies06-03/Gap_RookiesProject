# T-042 — EC2 배포 · 외부 포트 캡처(I 행 증거)

**담당:** DevOps · **브랜치:** `feature/infra` · **예상:** D5 · **선행:** T-032 · T-041

## [배경]
SPEC.md 스킬 P3-5 EC2 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
EC2 배포 · 외부 포트 캡처(I 행 증거).

## [수용 기준]
- [ ] `.env` 손으로 · chmod 600 · 외부 80 200 · 8080·8000·3306 실패
- [ ] `security/evidence/I-*.txt`
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-042` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `deploy/` · `security/evidence/I-*`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-042]` · 전면 재작성 금지

## [확인 명령]
```bash
curl -I http://<EC2>/ ; curl -m 3 http://<EC2>:8080
```
