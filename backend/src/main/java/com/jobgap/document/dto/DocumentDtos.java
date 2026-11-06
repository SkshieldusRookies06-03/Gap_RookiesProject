package com.jobgap.document.dto;

import com.jobgap.document.entity.DocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

/** SPEC §4.2 응답 모양 = 계약. id는 문자열(JS 53비트). (오너: BE-기능) */
public final class DocumentDtos {
    private DocumentDtos() {}

    public record DocumentSummary(String id, DocumentType type, String title, int charCount, OffsetDateTime createdAt) {}

    public record DocumentDetail(String id, DocumentType type, String title, int charCount, OffsetDateTime createdAt,
                                 String content, int maskedCount) {}

    public record TitleUpdateRequest(@NotBlank @Size(max = 100, message = "제목은 1~100자입니다") String title) {}
}
