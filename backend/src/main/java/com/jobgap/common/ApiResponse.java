package com.jobgap.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

/** 공통 응답 봉투 — SPEC §1 응답 봉투 행. 성공·에러 모두 이 모양 하나다. (오너: 기술 리드) */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        @JsonInclude(JsonInclude.Include.ALWAYS) @JsonProperty("data") T data,
        String message,
        OffsetDateTime timestamp,
        Integer statusCode,
        String code,
        List<FieldError> fields) {

    public static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    public record FieldError(String field, String message) {}

    public static <T> ApiResponse<T> ok(T data, String message) {
        return new ApiResponse<>(true, data, message, now(), null, null, null);
    }

    public static <T> ApiResponse<T> ok(T data) {
        return ok(data, "요청이 완료되었습니다");
    }

    /** 에러 봉투 — data 키는 성공 봉투에만 의미가 있지만 null로 함께 나간다(프론트는 success로 분기). */
    public static ApiResponse<Void> error(ErrorCode code, String message, List<FieldError> fields) {
        return new ApiResponse<>(false, null, message == null ? code.defaultMessage() : message, now(),
                code.status().value(), code.name(), fields == null || fields.isEmpty() ? null : fields);
    }

    public static ApiResponse<Void> error(ErrorCode code) {
        return error(code, null, null);
    }

    public static OffsetDateTime now() {
        return OffsetDateTime.now(SEOUL);
    }
}
