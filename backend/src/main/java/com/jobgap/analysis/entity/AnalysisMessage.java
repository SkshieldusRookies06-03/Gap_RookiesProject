package com.jobgap.analysis.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/**
 * SPEC §2 analysis_messages (V1__schema.sql) · 오너: BE-기능 T-013
 * role = USER | ASSISTANT (ASSISTANT는 스트림 완주 시에만 저장) · sources = JSON 배열 문자열(USER는 "[]")
 * 생성은 Analysis.addMessage(...)로만 한다.
 */
@Entity
@Table(name = "analysis_messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AnalysisMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "analysis_id", nullable = false)
    private Analysis analysis;

    @Column(name = "role", nullable = false, length = 10)
    private String role;

    @Column(name = "content", nullable = false, columnDefinition = "MEDIUMTEXT")
    private String content;

    @Column(name = "sources", nullable = false, columnDefinition = "TEXT")
    private String sources;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    /** 빌더는 같은 패키지(Analysis.addMessage)에서만 — 밖에서 만들면 messages 목록에 안 들어가 양방향이 어긋난다 */
    @Builder(access = AccessLevel.PACKAGE)
    private AnalysisMessage(Analysis analysis, String role, String content, String sources) {
        this.analysis = analysis;
        this.role = role;
        this.content = content;
        this.sources = sources;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now(ZoneId.of("Asia/Seoul"));
    }

}
