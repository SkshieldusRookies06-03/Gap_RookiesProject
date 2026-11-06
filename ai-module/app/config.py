"""환경변수 → 설정 한 곳 (오너: AI). 값의 정본은 SPEC §1 · §6. 호출할 때마다 환경변수를 읽는다(테스트가 바꿀 수 있게)."""
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    internal_token: str
    llm_provider: str          # openai | fake | fail (테스트)
    llm_model: str
    embedding_model: str       # 바꾸면 벡터 인덱스 재생성
    vector_dir: str            # compose named volume vector-data
    index_name: str            # FAISS 파일 <vector_dir>/<index_name>.faiss · .pkl
    grade_threshold: float
    report_chunks_per_doc: int  # ADR-08
    followup_k: int
    tavily_results: int


def settings() -> Settings:
    e = os.environ.get
    return Settings(
        internal_token=e("AI_INTERNAL_TOKEN", ""),
        llm_provider=e("LLM_PROVIDER", "openai"),
        llm_model=e("LLM_MODEL", "gpt-4o-mini"),
        embedding_model=e("EMBEDDING_MODEL", "text-embedding-3-small"),
        vector_dir=e("VECTOR_DIR", "/data/vector"),
        index_name=e("VECTOR_INDEX", "jobgap"),
        grade_threshold=float(e("GRADE_THRESHOLD", "0.45")),
        report_chunks_per_doc=int(e("REPORT_CHUNKS_PER_DOC", "12")),
        followup_k=int(e("FOLLOWUP_K", "4")),
        tavily_results=int(e("TAVILY_RESULTS", "3")),
    )
