package com.jobgap.common;

import com.jobgap.security.AuditLog;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.context.request.async.AsyncRequestTimeoutException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 에러 응답은 여기 한 곳(SPEC §4.4). 스택 트레이스는 서버 로그에만 — 응답에는 일반 메시지(B-8 · R-SE08).
 * 오너: 기술 리드 · 매핑 줄 추가는 T-037(BE-인증)이 수정 허용으로 가진다.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> business(BusinessException e) {
        return respond(e.code(), e.getMessage(), e.fields());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> invalid(MethodArgumentNotValidException e) {
        List<ApiResponse.FieldError> fields = e.getBindingResult().getFieldErrors().stream()
                .map(f -> new ApiResponse.FieldError(f.getField(), f.getDefaultMessage())).toList();
        return respond(ErrorCode.VALIDATION_ERROR, null, fields);
    }

    @ExceptionHandler({ConstraintViolationException.class, MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class, MissingServletRequestPartException.class,
            HttpMessageNotReadableException.class, HandlerMethodValidationException.class,
            ServletRequestBindingException.class})
    public ResponseEntity<ApiResponse<Void>> badRequest(Exception e) {
        return respond(ErrorCode.VALIDATION_ERROR, null, null);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> tooLarge(MaxUploadSizeExceededException e) {
        return respond(ErrorCode.FILE_TOO_LARGE, null, null);
    }

    @ExceptionHandler(AccessDeniedException.class)   // @PreAuthorize 거부 — 필터 단계 403(RestAccessDeniedHandler)과 같은 감사 로그(B-9)
    public ResponseEntity<ApiResponse<Void>> denied(AccessDeniedException e, HttpServletRequest req) {
        AuditLog.denied(req.getRemoteAddr(), req.getMethod(), req.getRequestURI());
        return respond(ErrorCode.FORBIDDEN, null, null);
    }

    /**
     * UNIQUE 위반 — 서비스의 사전 중복 검사를 지나친 경우(동시 요청 · 마스킹 후 같아진 제목). 500이 아니라 409로.
     * 제약 이름은 V1__schema.sql 기준.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> conflict(DataIntegrityViolationException e) {
        String m = String.valueOf(e.getMostSpecificCause().getMessage());
        if (m.contains("uk_users_email")) return respond(ErrorCode.DUPLICATE_EMAIL, null, null);
        if (m.contains("uk_documents_owner_title")) return respond(ErrorCode.DUPLICATE_TITLE, null, null);
        log.error("무결성 위반", e);
        return respond(ErrorCode.INTERNAL_SERVER_ERROR, null, null);
    }

    /** 스트림을 Accept: application/json으로 부르는 등 협상 실패 — 클라이언트 오류이므로 500·ERROR 로그로 보내지 않는다 */
    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<ApiResponse<Void>> notAcceptable(HttpMediaTypeNotAcceptableException e) {
        return respond(ErrorCode.VALIDATION_ERROR, "Accept 헤더를 확인하세요", null);
    }

    @ExceptionHandler({NoResourceFoundException.class, HttpRequestMethodNotSupportedException.class})
    public ResponseEntity<ApiResponse<Void>> notFound(Exception e) {
        return respond(ErrorCode.NOT_FOUND, null, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> unknown(Exception e) {
        log.error("처리되지 않은 예외", e);   // 스택은 로그에만
        return respond(ErrorCode.INTERNAL_SERVER_ERROR, null, null);
    }

    /** 스트림 클라이언트가 끊었거나(중단 버튼) async 타임아웃 — 응답을 쓸 수 없으니 조용히 끝낸다.
     *  주의: Flux SSE 응답에는 Spring이 async 타임아웃을 걸지 않는다 — 스트림 상한은 AiClient의 Flux.timeout(290s) */
    @ExceptionHandler({AsyncRequestNotUsableException.class, AsyncRequestTimeoutException.class})
    public void streamGone(Exception e) {
        log.debug("스트림 종료: {}", e.getClass().getSimpleName());
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> mediaType(HttpMediaTypeNotSupportedException e) {
        return respond(ErrorCode.VALIDATION_ERROR, "Content-Type을 확인하세요", null);
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ApiResponse<Void>> multipart(MultipartException e) {
        return respond(ErrorCode.VALIDATION_ERROR, "업로드 요청 형식을 확인하세요", null);
    }

    /** Content-Type을 JSON으로 고정 — 스트림 요청(Accept: text/event-stream)의 시작 전 403/404/400도 봉투로 나간다 */
    private ResponseEntity<ApiResponse<Void>> respond(ErrorCode code, String message, List<ApiResponse.FieldError> fields) {
        return ResponseEntity.status(code.status()).contentType(MediaType.APPLICATION_JSON).body(ApiResponse.error(code, message, fields));
    }
}
