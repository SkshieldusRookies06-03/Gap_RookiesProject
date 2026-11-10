"""벡터 저장소 — FAISS 인덱스 1개 + owner_uuid 메타데이터 필터 (ADR-03). 오너: AI · 티켓 T-018.
판정 테스트: tests/test_contract.py · tests/test_rag_contract.py (수정 금지). 구현 규칙은 SPEC 1 벡터 저장소 · docs/7 5.1절·6절.
재료: RecursiveCharacterTextSplitter · langchain_community.vectorstores.FAISS · as_retriever
"""
import re
import threading
from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

from . import providers
from .config import settings

_lock = threading.Lock()   # 동시에 두 요청이 저장하면 파일이 깨지지 않게 한 번에 하나씩
_store = None              # 메모리에 올라간 FAISS (처음 쓸 때 만든다)

_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

def _normalize_text(text: str) -> str:
    """연속 공백·탭을 한 칸으로 줄인다. 줄바꿈은 유지"""
    return re.sub(r"[ \t]+", " ", text)

def _relevance(d: float) -> float:
    """거리 d → 점수 0~1 (cosine). 단위 벡터면 d = 2 - 2cos 이므로 1 - d/2 = cos"""
    return max(0.0, min(1.0, 1 - d / 2))

def _load_store():
    """메모리에 FAISS가 없으면 파일에서 불러온다. 파일도 없으면 None (첫 적재 때 만든다)"""
    global _store
    if _store is None:
        s = settings()
        path = Path(s.vector_dir) / f"{s.index_name}.faiss"
        if path.exists():
            _store = FAISS.load_local(
                s.vector_dir, providers.get_embeddings(), s.index_name,
                allow_dangerous_deserialization=True,   # pickle 파일 — 이 컨테이너가 쓴 파일만 읽는다
                normalize_L2=True, relevance_score_fn=_relevance,
            )
    return _store


def _save():
    """바뀔 때마다 파일로 저장 — 컨테이너를 다시 띄워도 문서가 남는다"""
    s = settings()
    Path(s.vector_dir).mkdir(parents=True, exist_ok=True)
    _store.save_local(s.vector_dir, s.index_name)

def _ids_of(document_id: str, owner_uuid: str) -> list[str]:
    """이 owner의 이 문서 청크 id 목록 — 남의 청크는 절대 고르지 않는다 (A-3)"""
    store = _load_store()
    if store is None:
        return []
    return [
        i for i, doc in store.docstore._dict.items()
        if doc.metadata.get("document_id") == document_id
        and doc.metadata.get("owner_uuid") == owner_uuid
    ]    

def ingest_document(document_id: str, owner_uuid: str, doc_type: str, title: str, text: str) -> int:
    """청크 수를 돌려준다"""
    global _store
    chunks = _splitter.split_text(_normalize_text(text)) or [text]                        # 쪼개기
    metas = [                                                            # 이름표 4개
        {"owner_uuid": owner_uuid, "document_id": document_id, "doc_type": doc_type, "seq": i}
        for i in range(len(chunks))
    ]
    ids = [f"{owner_uuid}:{document_id}:{i}" for i in range(len(chunks))]

    with _lock:                                                          # 한 번에 한 명만
        old = _ids_of(document_id, owner_uuid)                           # 같은 문서가 있으면 빼기
        if old:
            _store.delete(ids=old)
        if _store is None:                                              
            _store = FAISS.from_texts(
                chunks, providers.get_embeddings(), metadatas=metas, ids=ids,
                normalize_L2=True, relevance_score_fn=_relevance,
            )
        else:                                                            
            _store.add_texts(chunks, metadatas=metas, ids=ids)
        _save()                                                          # 파일로 저장
    return len(chunks)


def delete_document(document_id: str, owner_uuid: str) -> None:
    """없어도 조용히 끝난다"""
    with _lock:                                    # 한 번에 한 명만
        old = _ids_of(document_id, owner_uuid)     # 이 사람의 이 문서 조각만
        if old:                                    # 없으면 아무것도 안 함 → 204
            _store.delete(ids=old)
            _save()                                # 지운 결과도 파일로 저장


def load_chunks(document_id: str, owner_uuid: str, limit: int) -> list[dict]:
    """REPORT 모드 — 그 문서의 청크를 seq 순서로 최대 limit개: [{documentId, docType, chunk, score}]"""
    store = _load_store()
    if store is None:
        return []
    docs = [
        d for d in store.docstore._dict.values()
        if d.metadata.get("document_id") == document_id
        and d.metadata.get("owner_uuid") == owner_uuid
    ]
    docs.sort(key=lambda d: d.metadata["seq"])     # 원문 순서대로 (ADR-08)
    return [
        {"documentId": document_id, "docType": d.metadata["doc_type"],
         "chunk": d.page_content, "score": 1.0}    # REPORT는 검색이 아니라 전부 로드 — 점수 의미 없음
        for d in docs[:limit]
    ]


def search(owner_uuid: str, document_ids: list[str], query: str, k: int) -> list[dict]:
    """FOLLOWUP 검색 — 내 문서 중 고른 문서에서만, 질문과 비슷한 조각 k개 (점수 0~1, 높은 순)"""
    store = _load_store()
    if store is None or store.index.ntotal == 0:
        return []
    ids = set(document_ids)

    def mine(meta: dict) -> bool:
        return meta.get("owner_uuid") == owner_uuid and meta.get("document_id") in ids

    hits = store.similarity_search_with_relevance_scores(
        query, k=k, filter=mine, fetch_k=store.index.ntotal)
    return [{"documentId": d.metadata["document_id"], "docType": d.metadata["doc_type"],
             "chunk": d.page_content, "score": float(s)} for d, s in hits]
