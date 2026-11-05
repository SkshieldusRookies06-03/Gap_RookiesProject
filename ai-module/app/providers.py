"""LLM·임베딩 공급자 한 곳 (오너: AI). 테스트는 LLM_PROVIDER=fake 로 키 없이 돈다(판정 테스트가 이 이름을 쓴다)."""
from langchain_core.embeddings import DeterministicFakeEmbedding
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from .config import settings

FAKE_ANSWER = "## 요구 기술\n| 기술 | 보유 |\n|---|---|\n| Kubernetes | 없음 |"


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
    return OpenAIEmbeddings(model=s.embedding_model)


def get_llm():
    s = settings()
    if s.llm_provider == "fake":
        return FakeListChatModel(responses=[FAKE_ANSWER])
    if s.llm_provider == "fail":
        return _FailingChat(responses=["x"])
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(model=s.llm_model, temperature=0, streaming=True, timeout=60)


def tavily_enabled() -> bool:
    import os
    return settings().llm_provider == "openai" and bool(os.environ.get("TAVILY_API_KEY"))
