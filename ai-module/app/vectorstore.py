"""벡터 저장소 — FAISS 인덱스 1개 + owner_uuid 메타데이터 필터 (ADR-03). 오너: AI · 티켓 T-018.
판정 테스트: tests/test_contract.py · tests/test_rag_contract.py (수정 금지). 구현 규칙은 SPEC §1 벡터 저장소 · docs/7 §5.1·§6.
재료: RecursiveCharacterTextSplitter · langchain_community.vectorstores.FAISS · as_retriever
"""


def ingest_document(document_id: str, owner_uuid: str, doc_type: str, title: str, text: str) -> int:
    """청크 수를 돌려준다"""
    raise NotImplementedError("T-018 미구현 — ingest_document")


def delete_document(document_id: str, owner_uuid: str) -> None:
    """없어도 조용히 끝난다(멱등)"""
    raise NotImplementedError("T-018 미구현 — delete_document")


def load_chunks(document_id: str, owner_uuid: str, limit: int) -> list[dict]:
    """REPORT 모드 — 그 문서의 청크를 seq 순서로 최대 limit개: [{documentId, docType, chunk, score}]"""
    raise NotImplementedError("T-019 미구현 — load_chunks")


def search(owner_uuid: str, document_ids: list[str], query: str, k: int) -> list[dict]:
    """FOLLOWUP 모드 — as_retriever 또는 similarity_search_with_relevance_scores(0~1, 높을수록 유사)"""
    raise NotImplementedError("T-029 미구현 — search")
