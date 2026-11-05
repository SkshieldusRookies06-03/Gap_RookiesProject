package com.jobgap.common;

import java.util.List;

/** 서비스가 던지는 유일한 업무 예외 — Advice가 봉투로 바꾼다. 예: throw new BusinessException(ErrorCode.FORBIDDEN) */
public class BusinessException extends RuntimeException {
    private final ErrorCode code;
    private final List<ApiResponse.FieldError> fields;

    public BusinessException(ErrorCode code) { this(code, code.defaultMessage(), null); }
    public BusinessException(ErrorCode code, String message) { this(code, message, null); }
    public BusinessException(ErrorCode code, String message, List<ApiResponse.FieldError> fields) {
        super(message);
        this.code = code;
        this.fields = fields;
    }

    public ErrorCode code() { return code; }
    public List<ApiResponse.FieldError> fields() { return fields; }
}
