package com.jobgap.security;

import com.jobgap.common.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/** 403 (필터 단계 · 예: USER 토큰으로 /actuator/metrics) — 감사 로그 + 봉투. 서비스의 소유 검증 403은 BusinessException(FORBIDDEN) + AuditLog.forbidden(). */
@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {
    private static final Logger audit = LoggerFactory.getLogger("AUDIT");
    private final SecurityResponses responses;

    public RestAccessDeniedHandler(SecurityResponses responses) {
        this.responses = responses;
    }

    @Override
    public void handle(HttpServletRequest req, HttpServletResponse res, AccessDeniedException ex) throws IOException {
        audit.warn("403 ip={} uri={} {}", req.getRemoteAddr(), req.getMethod(), req.getRequestURI());
        responses.write(res, ErrorCode.FORBIDDEN);
    }
}
