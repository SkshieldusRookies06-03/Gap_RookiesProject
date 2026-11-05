# T-041 — 빌드·푸시 워크플로 3개를 만든다

**담당:** DevOps · **브랜치:** `feature/infra` · **예상:** D4 · **선행:** T-023

## [배경]
SPEC.md 스킬 P3-5 GHA · R-DP04 — 이 절을 지시서(에이전트 프롬프트)에 붙여 넣는다.

## [목표]
빌드·푸시 워크플로 3개를 만든다.

## [수용 기준]
- [ ] backend·frontend·ai 각각 `docker/login-action` → `docker/build-push-action` · 태그 `${{ github.sha }}`
- [ ] Secrets 이름만 8번 가이드 §6에
- [ ] Actions 화면 green 캡처
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-041` 무출력

## [제약]
- 수정 허용: `.github/workflows/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)는 고치지 않는다 — 틀려 보이면 기술 리드에게
- commit·push는 사람이 한다 · 커밋 메시지 `type(범위): 요약 [T-041]`

## [확인 명령]
```bash
(GitHub Actions 화면)
```
