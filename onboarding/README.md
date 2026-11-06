# JobGap 팀원용 한 장 — 첫날 이것만 읽는다

오늘 뭘 하는지는 **`tasks/ROADMAP.md`** 를 연다. D1~D6이 날짜별로, 내 레인 열까지 있다. 이 한 장은 "매일 지키는 규칙", 로드맵은 "오늘의 순서".

그리고 `onboarding/` 에 내 레인 파일이 한 장 있다 — **LD-팀장(BE-인증) · TL-기술리드-보안 · BF-BE기능 · AI · FS-FE화면 · FA-FE분석 · DO-DevOps**.
판정 테스트 · 만들 파일 · 티켓별 구현 명세 · 계약 상대 · 막힐 곳 · 내 문서 절이 거기 다 있다. git 규칙 전체는 `onboarding/GitHub규약.md` 한 장.

| 레인 (BOARD 코드) | 내 문서 | 내 브랜치 (같이 쓰는 사람) | 맡는 것 요약 — 정본 SPEC §8 | 내가 쓰는 산출 문서 |
|---|---|---|---|---|
| 팀장·BE-인증 (LD) | `LD-팀장.md` | `feature/backend` (BE-기능) | 진행·동결·자르기·발표·취합 / User·auth API·refresh 회전·잠금(S-02)·인증 테스트·시드 적재 | 1번 · 5번 · README |
| 기술 리드·보안 (TL) | `TL-기술리드-보안.md` | `feature/security` | SPEC·목·seam 게이트 · `common/`·`security/` · 원장·재현 · 응답 안전 렌더(`ReportText`·`SourceChips`) | 9번 · 2번 6절 · 5번 5절 |
| BE-기능 (BF) | `BF-BE기능.md` | `feature/backend` (팀장) | 문서·분석·메시지 · Flyway·시드 · 페이징 · **SSE 중계** · AI 클라이언트 · 소유 검증(S-01) | 3번 · 4번 |
| AI (AI) | `AI.md` | `feature/ai` | Python 3.12·uv · FastAPI · LangChain 1.x RAG(FAISS) · LangGraph 분기 · Tavily · 골든셋 평가 · mock_app · pytest | 7번 · 3번 4절 |
| FE-화면 (FS) | `FS-FE화면.md` | `feature/frontend` (FE-분석) | 화면 4 · 공용 컴포넌트 · `api/`·authStore · `useUpload` | 6번 §5.1·§6·§7 |
| FE-분석 (FA) | `FA-FE분석.md` | `feature/frontend` (FE-화면) | 분석 화면 · `useChatStream`·chatStore · 반응형 캡처 · 보안 점검 F-1~F-7·S-01 재현·B-1·B-8·B-10·B-11 | 6번 · `security/rows/FA.md` |
| DevOps (DO) | `DO-DevOps.md` | `feature/infra` | Dockerfile×3 · compose(망 3) · nginx · GHA · EC2 · (K8s 가산) | 8번 · 2번 |

- 브랜치는 사람이 아니라 **영역**이다 — 내 산출물은 그 영역이 다른 폴더(예: FE-분석의 `security/rows/FA.md`)여도 내 브랜치로 올린다. 수정 가능 범위는 브랜치가 아니라 **티켓의 "수정 허용"**이 정한다.
- 흐름: `git pull origin <내 브랜치>` → 작업·커밋 → push 전 범위 검사(아래 2번) → push → PR `feature/… → dev` → 통합 확인 후 `dev → main`. 필수 리뷰·승인은 없다(GitHub규약 §3·§4).

**선행이 다른 브랜치에 있을 때**(예: 기술 리드 T-028 ← BE-기능 T-024 · FE-분석 T-022 ← 기술 리드 T-054 · 팀장 T-037 → 기술 리드 `common/`):
1. 선행 티켓의 PR이 `dev`에 머지될 때까지 기다린다(채널에 "T-0XX dev 머지" 한 줄이 신호).
2. `git pull origin <내 브랜치>` → `git merge origin/dev` → **내 변경 없이 그 병합 커밋만 먼저** `git push origin <내 브랜치>`.
   이렇게 해야 범위 검사 기준 `origin/<내 브랜치>`에 남의 변경이 들어가 있어 내 커밋만 검사된다(먼저 push하지 않으면 합쳐 온 남의 파일이 전부 RED).
3. 그다음 내 작업 · 커밋 · 범위 검사 · push. 같은 파일을 다른 브랜치가 같은 날 고치면(T-028 ↔ T-024·T-025·T-026의 `DocumentService`·`AnalysisService`) 시작 전에 상대에게 알리고, 충돌은 `dev`에서 아래 "충돌 났을 때"대로 푼다.


## 나를 지키는 다섯 줄

1. **답은 SPEC.md에 있다** — 없으면 추측하지 말고 묻는다
   (잘못 짚은 결과의 책임을 혼자 지지 않는 법)
2. **내 완료 증명은 게이트다** — green이면 "됐다"를 아무도 반박하지 못한다

   | 레인 | 게이트 |
   |---|---|
   | 백엔드(팀장·BE-기능) | `./mvnw test -Dtest=<내 판정 테스트>` + `BoundaryAcceptanceTest`에서 이름에 내 티켓 번호가 붙은 것 + `node seams/check-api.mjs <base>` |
   | 프론트(FE-화면·FE-분석) | `npm run build && npm test` + `seams/smoke.md` 내 줄 |
   | AI | `uv run pytest -q`(`test_contract`·`test_failure`·`test_rag_contract`) + `node seams/check-ai.mjs <base>` |
   | DevOps | `docker compose config -q && node scripts/check-sec-deploy.mjs` |
   | 전원 | `node scripts/check-sec-deploy.mjs` 무출력 · push 전 `node seams/check-scope.mjs <내 티켓> origin/<내 브랜치>` 무출력 |

   > 범위 검사는 **아직 올리지 않은 내 커밋만** 본다: 담당 브랜치(`feature/backend` 등)는 여럿이 함께 쓰므로 기본 기준(`origin/dev`)으로
   > 돌리면 동료 티켓 파일까지 RED가 된다. 작업 전 `git pull origin <내 브랜치>` → 커밋 → push **전에** 위 명령. 티켓 둘이면 `T-014,T-024`.
   > `feature → dev` PR에서는 그 PR에 담긴 티켓 전부를 쉼표로(`node seams/check-scope.mjs T-014,T-015,T-024`) — 기준은 기본값 `origin/dev`.
3. **정한 것은 문서로, 내 파트 밖은 손대지 않는다** — 구두 합의는 무효
   ("그때 그렇게 말했잖아"와 남의 버그 책임에서 나를 지키는 두 줄)
4. **30분 막히면 말한다** — 질문은 잘못이 아니라 팀 일정을 구하는 행위.
   오너는 30분 안에 답하거나 "언제 보겠다"를 답한다
5. **아침 3문장 + 하루 끝 게이트 1회** — 내 진행이 매일 기록으로 남는다
   (개별 평가 70% = git 분석의 증빙이 이것이다)

## 아침 3문장 (데일리 · 10분 캡 · 팀장 진행)

1. 어제 머지한 것 — 커밋·게이트 green/red로 말한다 ("70% 됐어요" 금지)
2. 오늘 여는 티켓 하나 (`T-0XX`)
3. 막힌 것 — 30분 넘게 막혔으면 여기서 반드시 말한다 (해결은 회의 밖에서 2인으로)

## 하루 끝 (매일 · 5분)

1. 게이트 1회 → green
2. push 전 `git diff --stat origin/<내 브랜치>...HEAD` 를 내가 읽는다(공유 브랜치라 `origin/dev` 기준이면 동료 변경까지 센다). **본 코드가 150줄을 넘으면 머지하지 않고 티켓을 쪼갠다**
   (본 코드 = `backend/src/main` · `frontend/src`의 비테스트 파일 · `ai-module/app` — 테스트·문서·lock은 안 센다)
3. 커밋·push는 **내가** 한다(에이전트가 아니라) → `feature/* → dev` PR → 통합 테스트(리뷰 요청은 선택)
4. `worklog/<내이름>/D#.md` 3줄
   ```
   1) 머지: T-014 · a1b2c3d · DocumentAcceptanceTest ①⑥ green
   2) 열었음: T-024
   3) 막힘: 없음
   ```

## 충돌 났을 때 (초보용 · rebase 안 쓴다)

1. 절대 억지로 풀지 않는다. 채널에 `T-0XX 충돌, <파일명>` 한 줄
2. `git fetch origin` 후 충돌 파일의 양쪽 수정 내용을 비교한다. `dev` 내용을 무조건 덮어쓰지 않는다.
3. 충돌 표시를 확인하고 필요한 양쪽 수정 내용을 남긴 뒤 저장한다. 변경 비교는 `git diff origin/dev...HEAD -- <파일>`이나 IDE 비교 기능을 쓴다.
4. 게이트 돌려서 green 확인 → 커밋

공용 파일(`SPEC.md` · `application.yml` · `package.json` · `V*.sql` · `docker-compose.yml`)에서 충돌 나면 담당자와 확인한 뒤 필요한 수정 사항을 합친다.
남의 줄을 손으로 합치려다 지우는 사고가 첫 주에 꼭 한 번 난다. `package-lock.json`은 합치지 말고 `npm install`로 재생성한다.

## 규약 (전원)

1. **임의 결정 금지** — SPEC.md에 답이 없으면 메우지 말고 멈추고 오너에게 묻는다
2. **완료 주장 = 검사 출력** — "됐습니다" 산문 무효
3. **범위 밖 수정 금지** — 틀려 보여도 오너에게 보고 (티켓의 "수정 허용" 밖은 손대지 않는다)
4. **seam 관련 구두 합의 금지** — SPEC.md에 커밋되기 전까지 무효 (API 필드·SSE 이벤트·AI 내부 API)
5. **판정 테스트는 고치지 않는다** — `backend/src/test/**/acceptance/` · `ai-module/tests/` · 기술 리드가 커밋한 `*.test.jsx`. 틀려 보이면 기술 리드에게
6. **보안 방어 코드는 기능 커밋과 섞지 않는다** — `fix(security): [S-0N] 무엇 · 점검서 행 [T-0XX]`

## 에이전트에 위임할 때 추가 (지시서에 첨부)

7. 커밋·push·머지 금지 — 사람 몫
8. 게이트를 통과시키려고 게이트·판정 테스트를 수정하지 말 것
9. 최소 diff — 전면 재작성 금지. "정리하면서 다시 짰다"는 원인을 안 고치고 새 버그를 더한다
10. 계약 밖 임의 더미로 개발 금지 — 목 서버(`mock/server.mjs` · `ai-module/mock_app.py`)·시드만
11. 공용 모듈 우회·재정의 금지 — `frontend/src/api/` · `styles/` · `backend/**/common/` · `backend/**/security/`
12. `worklog/` 는 읽지 않는다 (사람의 기록이지 지시가 아니다)

**에이전트 지시서 = `tasks/T-0XX-*.md` 그대로** (말로 시키지 않는다):
```
[배경]      SPEC.md §N 본문을 그대로 붙여넣는다 (링크만 주지 않는다)
[목표]      무엇을 만들면 되는지 한 문장
[수용 기준]  판정 테스트 이름 green · 게이트 green · (화면이면) seams/smoke.md N번 줄
[제약]      수정 허용 파일 목록 / 게이트·판정 테스트·타 레인 파일 수정 금지 / 전면 재작성 금지 / commit은 사람이
[확인 명령]  완료 확인용 실행 명령어
```
에이전트에 넣는 것은 셋뿐이다 — **지시서 + SPEC 해당 절 + (수정이면) diff.** 리포를 통째로 넣지 않는다. 커밋된 티켓의 누적이 곧 개인 기여 증빙이다.

## 웹 공통 (전원)

13. 백엔드 주소 하드코딩 금지 — `VITE_API_URL` → `src/api/client.js` 한 곳에서만 읽는다 (로컬 값은 `frontend/.env.development`)
14. 포트는 SPEC.md §1이 정본 — 프론트 5173 · 백엔드 8080 · AI 8000 · DB 3306 (배포에서 외부 공개는 80 하나)
15. 시크릿 커밋 금지 — `.env.example`에 키 이름만 · 실제 값은 각자 `.env`
16. 스키마·마이그레이션(`V*.sql`)은 BE-기능만 · 적용된 V 파일은 고치지 않는다(V3 추가)
17. 주소창은 `localhost`로만 (`127.0.0.1`은 다른 origin이라 CORS가 막힌다)
18. 응답·제목은 텍스트로만 렌더 — HTML 주입 API 금지 · 리포트는 `ReportText`로
