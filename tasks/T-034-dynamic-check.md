# T-034 — 동적 점검일: 원장 취합 · B-2~7·B-9·B-12~14·A·I 행 · S-02 Burp · SBOM. FE-분석 몫(F 행·B-1·8·10·11·S-01)은 `security/rows/FA.md`에서 합친다

**담당:** 기술 리드·보안 · **브랜치:** `feature/security` · **예상:** D4 · **선행:** T-026 · T-027 · T-028

## [배경]
SPEC.md §7 · onboarding/TL §3 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
동적 점검일: 원장 취합 · B-2~7·B-9·B-12~14·A·I 행 · S-02 Burp · SBOM. FE-분석 몫(F 행·B-1·8·10·11·S-01)은 `security/rows/FA.md`에서 합친다.

## [수용 기준]
- [ ] 원장 31행 결과 칸(FE-분석 행은 `security/rows/FA.md`에서 옮김)
- [ ] `security/evidence/bom.json`
- [ ] `node scripts/check-rubric-p3.mjs` R-SE10~12 green
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-034` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `security/LEDGER.md` · `security/evidence/S-02/` · `security/evidence/B-3*` · `security/evidence/B-4*` · `security/evidence/B-6*` · `security/evidence/B-7*` · `security/evidence/B-12*` · `security/evidence/B-13*` · `security/evidence/B-14*` · `security/evidence/A-*` · `security/evidence/I-*` · `security/evidence/sec-deploy.txt` · `security/evidence/bom.json` · `docs/9-*`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-034]` · 전면 재작성 금지

## [확인 명령]
```bash
node scripts/check-rubric-p3.mjs | grep R-SE
```
