# T-062 — S-01 IDOR 재현

**담당:** FE-분석 · **브랜치:** `feature/fe-analysis-T-062` · **예상:** D3 · **선행:** T-014(머지·소유 검증 없음) · T-015

## [배경]
SPEC.md §7 S-01 · onboarding/FA §9 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
S-01 IDOR 재현 — 조치 전 커밋에서 kim 토큰으로 lee 문서·분석을 열어 200을 캡처하고, T-026 머지 뒤 같은 요청 403으로 재확인한다.

## [수용 기준]
- [ ] 조치 전: `security/evidence/S-01/before.json` · `before-commit.txt`(해시) · `burp-before.png`(Repeater)
- [ ] 조치 후(T-026 뒤): `after.json`(403 봉투) · `burp-after.png` · 감사 로그 한 줄 `audit.log`
- [ ] `security/rows/FA.md` S-01 절 · 재현 끝나면 채널에 "S-01 재현 완료" → BE-기능이 T-026 머지
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-062` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `security/evidence/S-01/` · `security/rows/FA.md`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-062]` · 전면 재작성 금지
- 참고: 토큰 얻는 명령은 onboarding/FA §9

## [확인 명령]
```bash
curl -s localhost:8080/api/documents/3 -H "Authorization: Bearer $T"
```
