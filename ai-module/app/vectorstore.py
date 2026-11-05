"""벡터 저장소 — Chroma 단일 컬렉션 + owner_uuid 필터 (ADR-03). 오너: AI · 티켓 T-018.

판정 테스트: tests/test_contract.py (수정 금지 — 기술 리드 작성).
규칙:
- 분할: RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
- 메타데이터: owner_uuid · document_id · doc_type · seq(청크 순번)
- 같은 document_id 재적재 = 지우고 다시 넣는다(멱등)
- 검색·삭제·적재 전부 owner_uuid 조건 필수 — 빠지면 남의 문서가 답변에 섞인다(점검서 A-3)
재료: langchain_chroma.Chroma(collection_name, embedding_function=providers.get_embeddings(), persist_directory=settings().chroma_dir)
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
