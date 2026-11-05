# 역할 시트 — DevOps

> 정본은 `SPEC.md`. 이 시트는 요약이다 — 다르면 SPEC이 이긴다. 티켓 지시서는 `tasks/T-###-*.md`.

## 0. 내 판정 테스트 (지금 red인 것이 내 일이다)
(자동 판정 없음) `docker compose config` · `check-sec-deploy` 무출력 · 외부 포트 캡처

## 1. 한 줄
컨테이너·compose·nginx·CI/CD·EC2 — 배포 20점과 발표의 CI/CD 장.

## 2. 내 파일 / 안 건드리는 파일
- 소유: `docker-compose*.yml` · `**/Dockerfile` · `**/.dockerignore` · `nginx/` · `.github/workflows/` · `deploy/` · `k8s/` · `docs/2-*` · `docs/8-*`
- 안 건드림: 애플리케이션 코드 전부
- 공용 파일을 고쳐야 하면 그 오너에게 티켓으로 넘긴다 (`node seams/check-scope.mjs <티켓>`이 잡는다)

## 3. 내 계약 상대
생산: 실행 환경(포트·망·볼륨·env) — SPEC §1 포트 행이 정본 · 소비: 각 레인의 HEALTHCHECK 경로

## 4. 내 티켓 순서
T-008(스파이크③) → T-023 → T-032(1차 통합 E2E) → T-041(build-push) → T-042(EC2) → T-052(데모 시드·헬스) · (가산) CD·K8s는 D5 빈칸 0일 때

## 5. 내가 쓰는 문서 (내 절 = 내 커밋)
8번 컨테이너 배포 가이드 전부 · 2번 시스템 아키텍처(6절은 기술 리드)

## 6. 내 명령어
```bash
docker compose config -q && node scripts/check-sec-deploy.mjs
docker compose up -d --build && docker compose ps
curl -I http://<EC2>/ ; curl -m 3 http://<EC2>:8080 ; curl -m 3 http://<EC2>:8000
```

## 7. 막힐 곳
- frontend가 영영 안 뜸 → backend가 unhealthy(헬스 401이면 SecurityConfig 순서 — 이미 맞음 · curl 없으면 설치 줄)
- AI가 OpenAI에 못 나감 → ai-service를 internal 망에 넣었다(app 망은 일반 bridge)
- 업로드가 HTML 413 → nginx client_max_body_size 1m 누락
- 스트림이 한꺼번에 → 스트림 location proxy_buffering off
- EC2 1GB에서 빌드 중 멈춤 → 인스턴스 타입(T-008) 또는 GHA에서 빌드한 이미지를 pull

## 8. 발표에서 내가 말하는 한 문장
"외부에는 80 하나만 열려 있다 — 8080·8000·3306이 바깥에서 막혀 있는 캡처가 증거다."

## 9. 매일
아침: 그날 티켓 확인 · 저녁: 내 PR 머지 + `node scripts/check-sec-deploy.mjs` 무출력 + 1커밋 이상(개인 평가) · 막히면 30분 안에 채널에.
