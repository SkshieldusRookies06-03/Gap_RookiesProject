# T-011 — 골든셋 데이터: 공고 10 + 가짜 이력서 3 + 문항 10(그중 3개는 기업 최신 정보)

**담당:** AI · **브랜치:** `feature/ai-T-011` · **예상:** D1 · **선행:** —

## [배경]
SPEC.md §6.2 평가 · R-AI03 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
골든셋 데이터: 공고 10 + 가짜 이력서 3 + 문항 10(그중 3개는 기업 최신 정보).

## [수용 기준]
- [ ] `ai-module/eval/data/postings/*.md` 10 · `resumes/*.md` 3 — **실존 인물 정보 금지**
- [ ] `ai-module/eval/questions.md` 표(번호·공고·이력서·질문·정답·웹 필요)
- [ ] 문항 작성은 FE 둘·DevOps가 나눠 보내고 AI가 커밋
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-011` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `ai-module/eval/data/` · `ai-module/eval/questions.md`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-011]` · 전면 재작성 금지

## [확인 명령]
```bash
ls ai-module/eval/data/postings | wc -l
```
