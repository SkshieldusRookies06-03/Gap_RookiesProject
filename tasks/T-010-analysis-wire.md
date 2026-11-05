# T-010 — 분석 화면 와이어(종이 1장)를 SPEC §4.3과 대조하고, 목 스트림을 직접 읽어 본다

**담당:** FE-분석 · **브랜치:** `feature/frontend` · **예상:** D1 · **선행:** T-009

## [배경]
SPEC.md §4.3 · §5 — 이 절 본문을 지시서(에이전트 프롬프트)에 그대로 붙여 넣는다(링크만 주지 않는다).

## [목표]
분석 화면 와이어(종이 1장)를 SPEC §4.3과 대조하고, 목 스트림을 직접 읽어 본다.

## [수용 기준]
- [ ] `docs/wire/analysis.png` + 대조 결과 한 줄
- [ ] `node mock/server.mjs` 스트림을 브라우저 콘솔에서 토큰 단위로 확인(임시 코드는 커밋 안 함)
- [ ] `node scripts/check-sec-deploy.mjs` 무출력
- [ ] `node seams/check-scope.mjs T-010` 무출력
- [ ] 본 코드(src/main·app·src 비테스트) diff 150줄 이하 — 넘으면 티켓을 쪼갠다

## [제약]
- 수정 허용: `docs/wire/`
- 판정 테스트(`backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`)·게이트(`seams/`·`scripts/`)는 고치지 않는다
- commit·push는 사람이 한다 · 커밋 `type(범위): 요약 [T-010]` · 전면 재작성 금지

## [확인 명령]
```bash
(사진·콘솔 캡처를 PR 설명에)
```
