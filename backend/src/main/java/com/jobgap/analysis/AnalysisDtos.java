package com.jobgap.analysis;

import com.fasterxml.jackson.annotation.JsonRawValue;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

/** SPEC §4.3 모양 = 계약. (오너: BE-기능) */
public final class AnalysisDtos {
    private AnalysisDtos() {}

    /** 새 분석 = postingId+resumeId(question 없음) · 후속 = analysisId+question(필수) — 조합 검증은 서비스에서 400 */
    public record StreamRequest(String postingId, String resumeId, String analysisId,
                                @Size(max = 1000, message = "질문은 1000자 이하입니다") String question) {}

    public record AnalysisSummary(String id, String title, String postingTitle, String resumeTitle,
                                  int messageCount, String lastStatus, OffsetDateTime createdAt) {}

    /** sources는 DB의 JSON 문자열을 그대로 배열로 낸다 */
    public record MessageResponse(String id, String role, String content, @JsonRawValue String sources, OffsetDateTime createdAt) {}
}
