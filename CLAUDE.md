# JobGap — 에이전트 규약 (20줄 캡 · 사람도 읽는다)
1. 구조: frontend/(React) · backend/(Spring · com.jobgap) · ai-module/(FastAPI) · mock/ · seams/ · security/ · docs/ · tasks/.
   **충돌하면 SPEC.md가 정본이다.** 계약(API·SSE·내부 API)을 바꾸는 코드는 SPEC부터 고치는 PR이 먼저다.
2. 강제 규약: 응답은 공통 봉투 + DTO만(엔티티 반환 금지) · JSON camelCase · id는 문자열 · `@Transactional`은 서비스에만 ·
   프론트 API 호출은 `src/api/`만 · 응답 렌더는 텍스트(dangerouslySetInnerHTML 금지) · 비밀값은 환경변수만.
3. 보안 방어 코드는 기능 커밋과 섞지 않는다 → `fix(security): [S-0N] 무엇 · 점검서 행 [T-###]`.
4. 명령: 목 `node mock/server.mjs` · AI 목 `cd ai-module && uv run uvicorn mock_app:app --port 8000` ·
   계약 `node seams/check-api.mjs <base>` · `node seams/check-ai.mjs <base>` · 보안 `node scripts/check-sec-deploy.mjs` ·
   평가표 `node scripts/check-rubric-p3.mjs` · BE `./mvnw test` · FE `npm test` · AI `uv run pytest`.
5. 금지: seams/·scripts/ 게이트·판정 테스트 수정 · commit·push(사람이 한다) · 전면 재작성 · 내 티켓의 "수정 허용" 밖 파일 수정 ·
   `.env` 생성·커밋 · 실존 인물 개인정보를 데이터에 넣기 · `worklog/` 읽기 · 공용 모듈(api/·common/·security/) 우회.
6. 커밋 메시지: `type(범위): 요약 [T-###]` · 본 코드 diff 150줄 이하 · 규칙 전체는 onboarding/README.md · onboarding/GitHub규약.md.
