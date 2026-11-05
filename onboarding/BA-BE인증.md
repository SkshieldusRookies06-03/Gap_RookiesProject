# 역할 시트 — BE-인증

> 정본은 `SPEC.md`. 이 시트는 요약이다 — 다르면 SPEC이 이긴다. 티켓 지시서는 `tasks/T-###-*.md`.

## 0. 내 판정 테스트 (지금 red인 것이 내 일이다)
`AuthAcceptanceTest` 6 (red → T-015 · T-027)

## 1. 한 줄
사용자·인증(가입·로그인·refresh 회전·로그아웃·잠금)과 시드 적재를 맡는다.

## 2. 내 파일 / 안 건드리는 파일
- 소유: `backend/pom.xml` · `mvnw` · `application.yml`(BF와 공유 — 내 블록만) · `backend/**/auth/` · `backend/**/user/` · `backend/**/seed/` · `docs/5-*`
- 안 건드림: `common/`·`security/`(기술 리드) · `document/`·`analysis/`·`ai/`(BE-기능) · 판정 테스트
- 공용 파일을 고쳐야 하면 그 오너에게 티켓으로 넘긴다 (`node seams/check-scope.mjs <티켓>`이 잡는다)

## 3. 내 계약 상대
생산: `/api/auth/**`(SPEC §4.1) → 팀장 · 소비: `JwtProvider`·`PasswordEncoder`·감사 이벤트(기술 리드)

## 4. 내 티켓 순서
T-004 → T-015 → T-027(S-02 + SeedIngestRunner) → T-037 → T-044(5번 문서)

## 5. 내가 쓰는 문서 (내 절 = 내 커밋)
5번 Backend 개발명세서(엔티티 규약 표 · 인증 흐름 · 5절은 기술 리드)

## 6. 내 명령어
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d database
cd backend && ./mvnw test -Dtest=AuthAcceptanceTest
./mvnw spring-boot:run   # .env 값을 환경변수로
```

## 7. 막힐 곳
- 기동 시 "JWT_SECRET는 32바이트 이상" → `.env`의 JWT_SECRET 채우기(openssl rand -base64 48)
- Flyway "Unsupported Database" → `flyway-mysql` 의존성
- 잠금 테스트가 423 대신 401 → 잠금 검사를 비밀번호 비교보다 **먼저**
- 감사 로그가 안 찍힘 → AuthService에서 이벤트를 직접 발행(SecurityAuditListener 주석)

## 8. 발표에서 내가 말하는 한 문장
"Refresh는 해시로만 저장하고 매번 회전한다 — 탈취된 옛 토큰은 바로 401이다."

## 9. 매일
아침: 그날 티켓 확인 · 저녁: 내 PR 머지 + `node scripts/check-sec-deploy.mjs` 무출력 + 1커밋 이상(개인 평가) · 막히면 30분 안에 채널에.
