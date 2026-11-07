package com.jobgap.document;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    /** 내 문서 전체 (type 필터 없음) */
    Page<Document> findByOwnerId(Long ownerId, Pageable pageable);

    /** 내 문서 중 type 일치 */
    Page<Document> findByOwnerIdAndDocType(Long ownerId, DocumentType docType, Pageable pageable);

    /** 업로드 f — 같은 소유자·같은 제목이 있으면 409 DUPLICATE_TITLE */
    boolean existsByOwnerIdAndTitle(Long ownerId, String title);

    /** 제목 수정 — 자기 자신을 뺀 같은 소유자·같은 제목 */
    boolean existsByOwnerIdAndTitleAndIdNot(Long ownerId, String title, Long id);

    /** 소유 검증(S-01 · T-026) — owner를 join fetch해 트랜잭션 밖에서도 LazyInitializationException 없음 · 파라미터 바인딩(B-1) */
    @Query("select d from Document d join fetch d.owner where d.id = :id")
    Optional<Document> findWithOwner(@Param("id") Long id);
}
