# T-039 — 스트림 error UI + 프론트 보안 점검 F-1~F-7(증거·기록)

**담당:** FE-분석 · **브랜치:** `feature/frontend` · **예상:** D4 · **선행:** T-022 · T-054

## [배경]
SPEC.md §7 예비 F-1 행 · `docs/9-보안점검서.md` F-1~F-7 행 · `onboarding/FA-FE분석.md` T-039 절 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
스트림 error UI + 프론트 보안 점검 F-1~F-7(증거·기록).

## [수용 기준]
- [ ] error 이벤트 → `messageFor(error)` + 재시도
- [ ] F-1~F-7 증거 `security/evidence/F-*` · 결과·방법은 `security/rows/FA.md`(원장은 기술 리드가 합친다)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-039` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `frontend/src/pages/analysis/AnalysisPage.jsx` · `security/evidence/F-*` · `security/evidence/npm-audit.json` · `security/rows/FA.md`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-039]` · 전면 재작성 금지
- 참고: 원장(`security/LEDGER.md`)·9번은 직접 고치지 않는다 — 충돌 방지

## [확인 명령]
```bash
cd frontend && npm test
```
