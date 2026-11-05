# T-039 — 스트림 error UI + 원장 F-1~F-7 점검·증거·9번 F절 초안

**담당:** FE-분석 · **브랜치:** `feature/fe-analysis-T-039` · **예상:** D4 · **선행:** T-022 · T-054

## [배경]
SPEC.md onboarding/FA §9 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
스트림 error UI + 원장 F-1~F-7 점검·증거·9번 F절 초안.

## [수용 기준]
- [ ] error 이벤트 → `messageFor(error)` + 재시도
- [ ] `security/evidence/F-*` · 원장 F 행 · `docs/9-` F절 초안
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-039` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `frontend/src/pages/analysis/AnalysisPage.jsx` · `security/evidence/` · `security/LEDGER.md` · `docs/9-*`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-039]` · 전면 재작성 금지

## [확인 명령]
```bash
cd frontend && npm test
```
