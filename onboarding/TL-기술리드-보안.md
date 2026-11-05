# 역할 시트 — 기술 리드·보안

> 정본은 `SPEC.md`. 이 시트는 요약이다 — 다르면 SPEC이 이긴다. 티켓 지시서는 `tasks/T-###-*.md`.

## 0. 내 판정 테스트 (지금 red인 것이 내 일이다)
`SecurityAcceptanceTest` · `PiiMaskerTest`(내 것 · green 유지) / 전 레인 판정 테스트의 작성자(수정은 나만)

## 1. 한 줄
계약(SPEC·목·seam 검사)의 주인이자 보안 레인 — 판정 테스트를 미리 쓰고, 재현→조치→재확인으로 점검서를 채운다. 기능 코드는 남의 레인을 대신 짜지 않는다.

## 2. 내 파일 / 안 건드리는 파일
- 소유: `SPEC.md` · `CLAUDE.md` · `mock/` · `seams/` · `scripts/` · `security/` · `backend/**/common/` · `backend/**/security/` · `docs/9-*` · 판정 테스트
- 안 건드림: 다른 레인의 서비스·화면 코드(S-03 연결 1줄만 예외 — BF 리뷰)
- 공용 파일을 고쳐야 하면 그 오너에게 티켓으로 넘긴다 (`node seams/check-scope.mjs <티켓>`이 잡는다)

## 3. 내 계약 상대
생산: 계약 전체 — 바뀌면 SPEC·목·검사를 한 PR에서 · 리뷰: seam·보안 파일 PR 전부

## 4. 내 티켓 순서
T-001 → T-005 → (D1 저녁 동결) → T-016 → T-017 → T-028 · S-01/S-02 재현(조치 전 커밋에서) → T-033(D3 저녁 rubric) → T-034(D4 동적 점검) → T-048 → T-051

## 5. 내가 쓰는 문서 (내 절 = 내 커밋)
9번 보안점검서 전부(원장 → 파생) · 2번 6절(보안 아키텍처) · 5번 5절(보안 구현 · CSRF 사유 문장)

## 6. 내 명령어
```bash
node seams/check-api.mjs http://localhost:8080   # 목 / http://localhost (compose)
AI_INTERNAL_TOKEN=… node seams/check-ai.mjs http://127.0.0.1:8000
node scripts/check-sec-deploy.mjs && node scripts/check-rubric-p3.mjs
node seams/check-scope.mjs --owners · --overlap <그날 티켓들>
git log --oneline --grep='\[S-0'   # S-ID 커밋 수 = 점검서 §6 건수
```

## 7. 막힐 곳
- 재현보다 조치가 먼저 머지되면 "조치 전"이 이력에 없다 → T-026·T-027·T-028은 재현 캡처 뒤에 머지(리뷰에서 막는다)
- 판정 테스트가 틀렸다는 보고 → 테스트를 고치기 전에 SPEC 문장과 대조 — SPEC이 맞으면 구현이 고친다
- PR이 몰리면 1차 리뷰는 부오너에게(SPEC §8) — 나는 seam·보안 파일만

## 8. 발표에서 내가 말하는 한 문장
"보안은 주장이 아니라 이력이다 — 조치 전 커밋에서 재현하고, fix(security) 커밋으로 막고, 같은 요청으로 재확인했다."

## 9. 매일
아침: 그날 티켓 확인 · 저녁: 내 PR 머지 + `node scripts/check-sec-deploy.mjs` 무출력 + 1커밋 이상(개인 평가) · 막히면 30분 안에 채널에.
