# 스파이크① — OpenAI 응답·임베딩 (T-007)

- 일시: 2026-11-06 · 환경: Windows · Python 3.12.15 · uv · langchain-openai 1.7
- LLM: `gpt-4o-mini` — 응답 1건 성공 ("안녕하세요, 저는 다양한 주제에 대해 정보를 제공하고 대화를 나누는 AI 언어 모델입니다.")
- 임베딩: `text-embedding-3-small` — **차원 1536** (실측: `len(embed_query("Java Spring Boot 백엔드"))`)
- 결론: 키·네트워크·모델 정상. 임베딩 차원 1536 → docs/7 6절은 T-046에서 반영, docs/3 4절는 BE-기능(T-045)에 값 전달.