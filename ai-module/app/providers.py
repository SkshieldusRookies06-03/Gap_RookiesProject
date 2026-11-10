"""LLM·임베딩 공급자 한 곳 (오너: AI). 테스트는 LLM_PROVIDER=fake 로 키 없이 돈다(판정 테스트가 이 이름을 쓴다)."""
import os

from langchain_core.embeddings import DeterministicFakeEmbedding
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from .config import settings

FAKE_ANSWER = "## 요구 기술\n| 기술 | 보유 |\n|---|---|\n| Kubernetes | 없음 |"
GROQ_BASE_URL = "https://api.groq.com/openai/v1"   # Groq는 OpenAI와 같은 방식(호환 API)


class _FailingChat(FakeListChatModel):
    """LLM_PROVIDER=fail — 스트림 중 장애 경로(event: error) 판정용"""

    def _call(self, *args, **kwargs):
        raise RuntimeError("LLM 장애(테스트)")

    async def _astream(self, *args, **kwargs):
        raise RuntimeError("LLM 장애(테스트)")
        yield  # pragma: no cover


def get_embeddings():
    s = settings()
    if s.llm_provider in ("fake", "fail"):
        return DeterministicFakeEmbedding(size=64)
    from langchain_openai import OpenAIEmbeddings
    return OpenAIEmbeddings(model=s.embedding_model)   # 개발 테스트 groq, 임베딩은 OpenAI


def get_llm():
    s = settings()
    if s.llm_provider == "fake":
        return FakeListChatModel(responses=[FAKE_ANSWER])
    if s.llm_provider == "fail":
        return _FailingChat(responses=["x"])
    from langchain_openai import ChatOpenAI
    if s.llm_provider == "groq":   # 로컬 테스트용
        return ChatOpenAI(model=s.llm_model, base_url=GROQ_BASE_URL,
                          api_key=os.environ.get("GROQ_API_KEY", ""),
                          temperature=0, streaming=True, timeout=60)
    return ChatOpenAI(model=s.llm_model, temperature=0, streaming=True, timeout=60)


def tavily_enabled() -> bool:
    return settings().llm_provider in ("openai", "groq") and bool(os.environ.get("TAVILY_API_KEY"))