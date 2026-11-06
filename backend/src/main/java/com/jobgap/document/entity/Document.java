package com.jobgap.document.entity;

import com.jobgap.auth.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.time.ZoneId;

/** SPEC §2 documents (V1__schema.sql) · 본문은 마스킹된 텍스트만(ADR-04) · 오너: BE-기능 T-013 */
@Entity
@Table(name = "documents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false, length = 20, columnDefinition = "VARCHAR(20)")
    private DocumentType docType;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "MEDIUMTEXT")
    private String content;

    @Column(name = "char_count", nullable = false)
    private int charCount;

    @Column(name = "masked_count", nullable = false)
    private int maskedCount;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    /** charCount는 content에서 계산 — 빌더로 받지 않는다 · content·title은 마스킹을 마친 값 */
    @Builder
    private Document(User owner, DocumentType docType, String title, String content, int maskedCount) {
        this.owner = owner;
        this.docType = docType;
        this.title = title;
        this.content = content;
        this.charCount = content.length();
        this.maskedCount = maskedCount;
    }

    public void changeTitle(String title) {
        this.title = title;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now(ZoneId.of("Asia/Seoul"));
    }
}
