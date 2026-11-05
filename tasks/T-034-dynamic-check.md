# T-034 — 동적 점검일: 원장 B·A·I 행 · Burp(S-01·S-02 재확인) · SBOM. F 행은 FE-분석(T-039)

**담당:** 기술 리드·보안 · **브랜치:** `feature/techlead-T-034` · **예상:** D4 · **선행:** T-026 · T-027 · T-028

## [배경]
SPEC.md §7 · onboarding/TL §3 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
동적 점검일: 원장 B·A·I 행 · Burp(S-01·S-02 재확인) · SBOM. F 행은 FE-분석(T-039).

## [수용 기준]
- [ ] 원장 31행 결과 칸(F 행은 FE-분석 기록을 취합)
- [ ] `security/evidence/bom.json`
- [ ] `node scripts/check-rubric-p3.mjs` R-SE10~12 green
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-034` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `security/` · `docs/9-*`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-034]` · 전면 재작성 금지

## [확인 명령]
```bash
node scripts/check-rubric-p3.mjs | grep R-SE
```
