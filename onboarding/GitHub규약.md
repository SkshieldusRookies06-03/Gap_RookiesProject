# GitHub 규약 — 브랜치 · 커밋 · PR · 리뷰 · 머지 (한 장)

> 개인 평가 70%가 git 분석이다. **누가 무엇을 했는지가 이력에 그대로 남게** 쓰는 것이 이 규약의 목적이다.

## 1. 브랜치

| 브랜치 | 용도 | 규칙 |
|---|---|---|
| `main` | 통합·배포 기준 | **보호** — 직접 푸시 금지 · PR만 · 승인 1 · Code Owners 리뷰 필수 · CI 1단계 green 필수 |
| `feature/<레인>-<T-0XX>` | 티켓 하나 | 티켓 하나 = 브랜치 하나 = PR 하나 · 레인: `lead` `techlead` `be-feature` `ai` `fe-screens` `fe-analysis` `devops` |
| `spike/<이름>` | D1 스파이크 | 머지하지 않는다 — 결과는 `docs/spikes/*.md`로 따로 PR |
| `demo/S-0N` | 보안 재현(방어 해제) | 머지하지 않는다 — 기술 리드만 |

```bash
git switch main && git pull
git switch -c feature/be-feature-T-014
```

## 2. 커밋 메시지

형식: **`type(범위): 요약 [T-0XX]`** — type과 티켓 번호 **둘 다**(평가표 게이트가 90% 이상인지 센다).

| type | 언제 | 예 |
|---|---|---|
| `feat` | 기능 | `feat(document): 문서 목록·상세 API [T-014]` |
| `fix` | 버그 | `fix(stream): done 이벤트 messageId 누락 [T-025]` |
| `fix(security)` | **보안 조치 — 방어 코드만** | `fix(security): [S-01] 문서·분석 소유 검증 · B-2 [T-026]` |
| `test` | 테스트 | `test(auth): 잠금 회귀 테스트 [T-027]` |
| `docs` | 문서 | `docs(api): 4번 API 설계서 엔드포인트 표 [T-045]` |
| `chore` · `ci` · `build` · `refactor` · `style` | 설정·CI·빌드·정리 | `ci: 빌드·푸시 워크플로 3개 [T-041]` |

- 요약은 한국어로, 무엇을 바꿨는지 한 줄. "수정", "작업" 같은 말만 쓰지 않는다
- 티켓이 없는 잡일은 `[T-000]`
- 페어로 했으면 본문 끝에 `Co-authored-by: 이름 <깃허브 이메일>` (대신 커밋 금지)
- 한 커밋 = 한 의도. 기능과 보안 방어를 한 커밋에 섞지 않는다 — **"조치 전"이 이력에 남아야 보안 점수가 된다**

## 3. PR

- 제목 = 대표 커밋 메시지와 같은 형식 (`feat(document): … [T-014]`)
- 본문 = `.github/PULL_REQUEST_TEMPLATE.md` 그대로 채운다 — **확인 명령 출력을 붙인다**(산문 금지)
- 크기: 본 코드 diff **150줄 이하**. 넘으면 티켓을 쪼개 PR을 둘로
- 리뷰어: CODEOWNERS가 자동 지정(파일 오너) + 부오너(SPEC §8)
- 계약 파일(`SPEC.md` · `mock/` · `seams/` · `ai-module/mock_app.py`)을 바꾸면 **기술 리드 리뷰 필수** · 같은 PR에서 목·검사도 함께

## 4. 리뷰 (30분 규칙)

| 리뷰어가 보는 것 | 기준 |
|---|---|
| 게이트 | PR 본문에 확인 명령 출력이 있고 green인가 |
| 범위 | `node seams/check-scope.mjs <티켓>` 무출력인가 — 남의 파일을 건드리지 않았나 |
| 계약 | 응답 필드·에러 코드·이벤트 이름이 SPEC과 같은가 |
| 보안 | 비밀값·`*` CORS·HTML 주입·문자열 이어붙인 쿼리가 없나 · `check-sec-deploy` 무출력 |

- 요청받으면 **30분 안에** 리뷰하거나 "몇 시에 보겠다"를 단다
- 승인 = "Approve" 버튼 · 고칠 것 = "Request changes" + 줄 단위 코멘트 · 말로만 하지 않는다

## 5. 머지

- **"Create a merge commit"만** 쓴다 (Settings → General → Pull Requests에서 squash·rebase 끄기)
  — squash는 PR 하나를 커밋 하나로 뭉개 **개인 커밋 이력이 사라진다**
- 머지는 PR 작성자가 승인 받은 뒤 직접 · 머지 후 브랜치 삭제
- D5 저녁 기능 동결 이후에는 `fix:` PR만

## 6. 충돌

`onboarding/README.md` "충돌 났을 때" 4단계 — rebase 쓰지 않는다 · 공용 파일은 main 것을 받고 내 줄만 다시 넣는다.

## 7. 금지

- `git push -f` (남의 커밋이 사라진다) · `main` 직접 푸시 · `.env`·키 커밋(커밋했으면 **키부터 폐기·재발급** 후 기술 리드에게)
- 남의 브랜치에 커밋 · 판정 테스트·게이트 파일 수정 · 다른 사람 이름으로 커밋

## 8. 제출

- D6 저녁: 기술 리드가 제출 게이트 통과 후 `main`에 태그 `v1.0` (`git tag -a v1.0 -m "제출" && git push origin v1.0`)
- 제출 후 `main` 보호 유지 — 발표 중 수정 금지
