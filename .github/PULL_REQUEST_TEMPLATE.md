<!-- 제목: type(범위): 요약 [T-0XX] — onboarding/GitHub규약.md -->
## 티켓
T-0XX — `tasks/T-0XX-*.md` · 출발 브랜치 `feature/backend|frontend|ai|security|infra` · 대상 `dev` (최종 통합 시 `dev → main`)

## 바꾼 것 (한 줄)

## 확인 명령 출력 (붙여넣기 · 산문 금지)
```
(티켓의 [확인 명령] 출력)
```

## 체크
- [ ] 판정 테스트·게이트 green (위 출력)
- [ ] `node seams/check-scope.mjs T-0XX,T-0YY` 무출력 — 이 PR에 담긴 티켓 전부(공유 브랜치 · 기준 기본값 `origin/dev`)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] 변경량·내용 확인 (`git diff --stat origin/dev...HEAD` · `dev → main` PR은 `origin/main...HEAD`)
- [ ] 계약(SPEC §4·§6)을 바꿨다면 SPEC·mock·seams를 같은 PR에서
- [ ] 보안 방어 코드는 `fix(security): [S-0N]` 커밋으로 분리
- [ ] 화면 작업이면 `seams/smoke.md` 통과한 줄 번호: 
