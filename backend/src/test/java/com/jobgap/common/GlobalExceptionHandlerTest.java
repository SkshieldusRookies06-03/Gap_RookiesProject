package com.jobgap.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.bind.ServletRequestBindingException;

/**
 * 에러 매핑 회귀 — SPEC §4.4 · 점검서 B-8·B-9. 오너: 기술 리드.
 * 컨텍스트·DB 없이 Advice 메서드를 직접 부른다(매핑 표가 맞는지만 본다 · 실제 디스패치는 acceptance가 본다).
 */
@DisplayName("[기술 리드 T-005] GlobalExceptionHandler — 500으로 새던 예외 매핑")
@ExtendWith(OutputCaptureExtension.class)
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("UNIQUE(email) 위반 → 409 DUPLICATE_EMAIL (동시 가입 경쟁)")
    void duplicateEmail() {
        var e = new DataIntegrityViolationException("could not execute statement [(conn=7) Duplicate entry 'kim@example.com' for key 'uk_users_email']");
        assertEnvelope(handler.conflict(e), 409, "DUPLICATE_EMAIL");
    }

    @Test
    @DisplayName("UNIQUE(owner,title) 위반 → 409 DUPLICATE_TITLE (마스킹 후 같아진 제목)")
    void duplicateTitle() {
        var cause = new java.sql.SQLIntegrityConstraintViolationException("Duplicate entry '1-연락처 010-****-****' for key 'uk_documents_owner_title'");
        var e = new DataIntegrityViolationException("could not execute statement", cause);
        assertEnvelope(handler.conflict(e), 409, "DUPLICATE_TITLE");
    }

    @Test
    @DisplayName("모르는 무결성 위반(FK 등)은 409로 꾸미지 않고 500 — 메시지는 일반 문구")
    void otherIntegrityViolationIs500() {
        var e = new DataIntegrityViolationException("Cannot add or update a child row: a foreign key constraint fails (fk_documents_owner)");
        var r = handler.conflict(e);
        assertEnvelope(r, 500, "INTERNAL_SERVER_ERROR");
        assertThat(r.getBody().message()).doesNotContain("fk_documents_owner");   // B-8 — 내부 정보 미노출
    }

    @Test
    @DisplayName("Accept 협상 실패(스트림을 Accept: application/json으로) → 400 봉투, 500 아님")
    void notAcceptableIs400() {
        assertEnvelope(handler.notAcceptable(new HttpMediaTypeNotAcceptableException("text/event-stream")), 400, "VALIDATION_ERROR");
    }

    @Test
    @DisplayName("바인딩 예외(필수 헤더·쿠키 누락 등) → 400 봉투")
    void bindingExceptionIs400() {
        assertEnvelope(handler.badRequest(new ServletRequestBindingException("Missing request header")), 400, "VALIDATION_ERROR");
    }

    @Test
    @DisplayName("@PreAuthorize 거부 → 403 봉투 + AUDIT 403 한 줄 (B-9 · 필터 단계와 같은 모양)")
    void methodLevelDeniedIsAudited(CapturedOutput output) {
        var req = new MockHttpServletRequest("GET", "/api/admin/thing");
        req.setRemoteAddr("10.1.2.3");
        assertEnvelope(handler.denied(new AccessDeniedException("Access Denied"), req), 403, "FORBIDDEN");
        assertThat(output.getAll()).contains("403 ip=10.1.2.3").contains("/api/admin/thing");
    }

    private static void assertEnvelope(ResponseEntity<ApiResponse<Void>> r, int status, String code) {
        assertThat(r.getStatusCode().value()).isEqualTo(status);
        assertThat(r.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
        assertThat(r.getBody()).isNotNull();
        assertThat(r.getBody().success()).isFalse();
        assertThat(r.getBody().code()).isEqualTo(code);
        assertThat(r.getBody().statusCode()).isEqualTo(status);
    }
}
