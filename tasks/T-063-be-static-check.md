# T-063 — 백엔드 정적·입력 점검 B-1·B-8·B-10·B-11

**담당:** FE-분석 · **브랜치:** `feature/frontend` · **예상:** D4 · **선행:** T-026 · T-037

## [배경]
SPEC.md §4.4 · onboarding/FA §9 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
백엔드 정적·입력 점검 B-1·B-8·B-10·B-11 — 실행한 명령과 결과를 기록한다.

## [수용 기준]
- [ ] B-1 쿼리 이어붙이기 grep 0 + sort 인젝션 400 · B-8 500 응답에 스택 없음 · B-10 업로드 경계(300KB·.exe·이중 확장자) · B-11 필드별 400 fields[]
- [ ] 증거 `security/evidence/B-*.txt` · 결과는 `security/rows/FA.md`
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-063` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `security/evidence/B-1.txt` · `security/evidence/B-8.txt` · `security/evidence/B-10.txt` · `security/evidence/B-11.txt` · `security/rows/FA.md`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-063]` · 전면 재작성 금지

## [확인 명령]
```bash
grep -rn '" *+ *[a-z]' backend/src/main --include=*Repository.java | wc -l
```
