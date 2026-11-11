# 보안 시연 대본 — 5분 (T-051 · 초안 11/10 · 오너: 기술 리드)

> 순서 고정(onboarding/TL §T-051): **S-01 Burp Repeater(전·후) → S-02 Intruder(전·후) → S-03 마스킹 전후 JSON → 원장 셈**
> 원칙: **"전"은 캡처로, "후"는 라이브로** — 조치 전 상태는 demo 브랜치를 다시 띄워야 해서 5분 안에 못 한다. 라이브가 실패하면 "후" 캡처로 바로 넘어간다.
> 표시 ⏳ = 아직 증거가 없어 D6 전에 채울 칸.

## 0. 시작 전 준비 (발표 30분 전 · 체크)

- [ ] 대상 서버: EC2 `http://<EC2>` (⏳ T-042) — 없으면 로컬 compose `http://localhost`
- [ ] 시드 상태: DB 초기화 + backend `SPRING_PROFILES_ACTIVE=seed` 1회 기동(시드 문서 AI 적재) — 안 하면 분석 답이 엉뚱하다
- [ ] **kim 잠금 풀림 확인** — 리허설에서 잠갔다면 15분 기다리거나 DB 초기화. S-02 라이브는 kim, 그 밖 시연은 lee
- [ ] Burp: 프록시 OFF(Repeater·Intruder만 씀) · 탭 3개 미리 준비
  - Repeater ①: `GET /api/documents/3` · Authorization = **kim** 토큰 (lee 문서)
  - Repeater ②: `GET /api/analyses/1/messages` · kim 토큰 (lee 분석)
  - Intruder: `POST /api/auth/login` kim · password 위치 § · 페이로드 `wrong1`~`wrong10` · **Resource pool 동시 1**
- [ ] kim 토큰은 시연 직전에 발급(Access 15분) — `POST /api/auth/login` 응답의 accessToken
- [ ] 캡처 파일 열어 두기: `S-01/burp-before.png`(⏳) · `S-02/intruder-before.png` · `S-03/before.json` · `S-03/after.json`

## 1. S-01 IDOR — 1분 30초

| 화면 | 말할 것 |
|---|---|
| `S-01/burp-before.png` (⏳ FA T-062) | "kim으로 로그인한 토큰에 문서 번호만 lee 것(3)으로 바꿨습니다. 조치 전에는 **200으로 남의 이력서가 그대로** 나왔습니다." |
| Burp Repeater ① **라이브 Send** | "지금은 같은 요청이 **403 FORBIDDEN 봉투**입니다. 404로 숨기지 않고 403 + 감사 로그를 남깁니다(ADR-06)." |
| Repeater ② 라이브 Send | "분석 메시지도 같은 방식으로 막았습니다." |
| (말로) | "조치: `DocumentService.findOwned` · `AnalysisService.ownedAnalysis` — 커밋 `2a3bf48` · `ecfc7bd`, 회귀 테스트 `8411341`." |

## 2. S-02 로그인 무차별 대입 — 1분 30초

| 화면 | 말할 것 |
|---|---|
| `S-02/intruder-before.png` | "잠금 없는 커밋(`0b81eba`)에서 비밀번호 10개를 넣었더니 **10건 전부 401, 계속 시도 가능**했습니다." |
| Burp Intruder **라이브 Start attack** | "지금은 **6번째부터 423 ACCOUNT_LOCKED**와 해제 시각이 나옵니다. 잠금 확인을 비밀번호 비교보다 먼저 해서, 잠긴 동안엔 맞는 비밀번호도 423입니다." |
| (예상 질문 대비) | "표에서 `wrong5`부터 423인 건 Burp가 요청 0(기준 요청)도 보내서입니다 — 실제 6번째 시도입니다." |

## 3. S-03 개인정보 마스킹 — 1분

| 화면 | 말할 것 |
|---|---|
| `S-03/before.json` ↔ `S-03/after.json` 나란히 | "가짜 연락처가 든 이력서를 올렸을 때, 조치 전엔 **제목·본문에 원문 그대로, maskedCount 0** → 조치 후엔 **마스킹본만, maskedCount 2**입니다. DB에도, OpenAI에도 원문이 나가지 않습니다." |
| (말로) | "업로드 본문·제목·후속 질문 세 경로 모두 `PiiMasker`를 거칩니다 — `c7fa960` · `ecf2f31`. 감사 로그의 이메일도 `k***@e.com`." |

## 4. 원장 셈 — 1분

| 화면 | 말할 것 (11/10 현재값 · D6에 아래 명령으로 다시 센다) |
|---|---|
| `security/LEDGER.md` 표 | "OWASP Web·API·LLM 기준 **31개 항목**을 점검했습니다. **발견 3 · 조치 3 · 잔여 1(A-4)**, 미발견 17, 해당 없음 3(사유 기록)." ⏳ FA·AI·EC2 7행 반영 후 갱신 |
| 점검서 §7 | "고치지 않은 위험도 **11개를 잔여 위험으로 측정값과 함께** 남겼습니다 — 예: Rate Limit 없음(20회/6초 전부 통과), 잠금 응답 차이로 인한 계정 열거." |

다시 세는 명령(D6):
```bash
# 셀 안의 \| 를 먼저 치환해야 칸이 밀리지 않는다 · 11/10 결과: 발견 3 · 미조치 1 · 미발견 17 · 해당 없음 3 · 빈칸 7
sed 's/[\]|/~/g' security/LEDGER.md | awk -F'|' '/^\| [BFAI]-[0-9]+ /{v=$4; gsub(/^ +| +$/,"",v); sub(/\(.*/,"",v); if(v=="") v="(빈칸)"; print v}' | sort | uniq -c
node scripts/check-rubric-p3.mjs && node scripts/check-sec-deploy.mjs     # 무출력이어야 한다
```

## 5. 막히면 (대체 경로)

| 상황 | 대체 |
|---|---|
| EC2 접속 실패 | 로컬 compose로 같은 순서 · 그것도 안 되면 "후" 캡처(`S-01/burp-after.png` ⏳ · `S-02/intruder-after.png` · `S-03/after.json`) |
| kim이 이미 잠겨 있음 | S-02 라이브 생략 → `intruder-after.png` · 잠긴 상태 자체를 "맞는 비밀번호도 423" 시연으로 사용 |
| 토큰 만료(401) | 로그인 다시 → Repeater Authorization 교체 (10초) |
| Burp 실행 불가 | `curl` 같은 요청 · `S-02/curl-after.txt` |

## 6. 예상 질문

| 질문 | 답 |
|---|---|
| 잠금을 악용해 남의 계정을 잠글 수 있지 않나? | 맞다. §7 잔여 위험 — 15분 자동 해제, 향후 IP 기준 제한·CAPTCHA |
| 반복 호출로 AI 비용을 소모시킬 수 있나? | 측정했다(20회/6초 통과). 길이·검색 상한은 있으나 횟수 제한은 범위상 잔여 위험(A-4 · §7) — 적용안 nginx `limit_req` |
| 마스킹이 이름·주소도 가리나? | 정규식으로는 판별 불가 — §7 잔여 위험, 데모는 가짜 인물만 |
| CSRF는 왜 해당 없음인가? | 쿠키 인증이 없다. 토큰은 Authorization 헤더로만 가고 브라우저가 자동으로 붙이지 않는다(B-6) |
| 의존성 취약점은? | SBOM 141개 OSV 조회 0건 · Spring Boot 3.3.5 시절 150건을 4.1.2 전환으로 해소(B-13 · `95dc5bb`) |
