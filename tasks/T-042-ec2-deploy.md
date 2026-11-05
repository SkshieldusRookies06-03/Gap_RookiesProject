# T-042 — EC2에 compose로 배포하고 외부 포트 캡처를 남긴다

**담당:** DevOps · **브랜치:** `feature/devops-T-042` · **예상:** D5 · **선행:** T-032 · T-041

## [배경]
SPEC.md 스킬 P3-5 EC2 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
EC2에 compose로 배포하고 외부 포트 캡처를 남긴다.

## [수용 기준]
- [ ] 보안그룹 80 전체 · 22 내 IP만 · `.env`는 서버에서 손으로(chmod 600)
- [ ] 외부 `curl -I http://<EC2>/` 200 · `curl -m 3 http://<EC2>:8080`·`:8000`·`:3306` 실패 캡처
- [ ] 8번 컨테이너 배포 가이드
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-042` 무출력

## [제약]
- 수정 허용: `deploy/` · `docs/8-`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-042]`

## [확인 명령]
```bash
curl -I http://<EC2>/ && curl -m 3 http://<EC2>:8080
```
