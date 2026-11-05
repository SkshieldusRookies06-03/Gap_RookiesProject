package com.jobgap.common;

import org.springframework.http.HttpStatus;

/** SPEC §4.4 에러 코드 표와 1:1. 코드를 더하려면 SPEC 표부터 고친다. (오너: 기술 리드) */
public enum ErrorCode {
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "입력값을 확인하세요"),
    DOCUMENT_TYPE_MISMATCH(HttpStatus.BAD_REQUEST, "공고와 이력서를 각각 골라 주세요"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다"),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "토큰이 만료되었습니다"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다"),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "다시 로그인하세요"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다"),
    DOCUMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "문서를 찾을 수 없습니다"),
    ANALYSIS_NOT_FOUND(HttpStatus.NOT_FOUND, "분석을 찾을 수 없습니다"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "없는 경로입니다"),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 가입된 이메일입니다"),
    DUPLICATE_TITLE(HttpStatus.CONFLICT, "같은 제목의 문서가 있습니다"),
    FILE_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "200KB 이하 파일만 올릴 수 있습니다"),
    UNSUPPORTED_FILE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, ".md 또는 .txt(UTF-8) 파일만 올릴 수 있습니다"),
    ACCOUNT_LOCKED(HttpStatus.LOCKED, "로그인 5회 실패로 잠겼습니다"),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "잠시 후 다시 시도해 주세요"),
    AI_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "분석 서버가 응답하지 않습니다");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    public HttpStatus status() { return status; }
    public String defaultMessage() { return defaultMessage; }
}
