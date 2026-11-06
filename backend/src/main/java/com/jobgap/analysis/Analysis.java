package com.jobgap.analysis;

import com.jobgap.document.Document;
import com.jobgap.auth.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * SPEC §2 analyses (V1__schema.sql) · 오너: BE-기능 T-013
 * 유일한 양방향(R-BE04): 대화 화면이 메시지를 순서대로 읽고, 분석과 생명주기가 같다 → 메시지는 orphanRemoval로 함께 삭제.
 */
@Entity
@Table(name = "analyses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Analysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "posting_id", nullable = false)
    private Document posting;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resume_id", nullable = false)
    private Document resume;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @OneToMany(mappedBy = "analysis", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<AnalysisMessage> messages = new ArrayList<>();

    @Builder
    private Analysis(User owner, Document posting, Document resume, String title) {
        this.owner = owner;
        this.posting = posting;
        this.resume = resume;
        this.title = title;
    }

    public AnalysisMessage addMessage(String role, String content, String sourcesJson) {
        AnalysisMessage m = AnalysisMessage.builder()
                .analysis(this).role(role).content(content).sources(sourcesJson)
                .build();
        messages.add(m);
        return m;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now(ZoneId.of("Asia/Seoul"));
    }
}
