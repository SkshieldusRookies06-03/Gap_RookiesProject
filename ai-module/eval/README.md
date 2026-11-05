# 골든셋 평가 (R-AI03 · 오너: AI · 티켓 T-011 데이터 · T-035 실행)

- `data/postings/*.md` 공고 10개 · `data/resumes/*.md` **가짜** 이력서 3개(실존 인물 정보 금지)
- `questions.md` 문항 10개 = 표 한 줄에 `번호 · 공고 파일 · 이력서 파일 · 질문 · 정답(요구 기술 목록 또는 한 줄) · 웹 필요(Y/N)` — 그중 3개는 기업 최신 정보(Y)
- 실행: `LLM_PROVIDER=openai python eval/run_eval.py` → `eval/result.md`에 세 조건(① LLM 단독 ② +RAG ③ +RAG+Tavily)의
  정답 수 · 근거 표시율 표 (채점은 사람 2명이 나눠서 하고 불일치는 팀장이 판정)
- 발표 수치는 이 표의 숫자만 쓴다(명령 근거 없는 수치 금지)
