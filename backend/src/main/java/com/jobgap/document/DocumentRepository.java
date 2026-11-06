package com.jobgap.document;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    /** 내 문서 전체 (type 필터 없음) */
    Page<Document> findByOwnerId(Long ownerId, Pageable pageable);

    /** 내 문서 중 type 일치 */
    Page<Document> findByOwnerIdAndDocType(Long ownerId, DocumentType docType, Pageable pageable);
}
