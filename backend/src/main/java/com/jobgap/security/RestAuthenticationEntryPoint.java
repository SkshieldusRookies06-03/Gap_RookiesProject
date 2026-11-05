package com.jobgap.security;

import com.jobgap.common.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/** 401 — 감사 로그(IP·URI) + 봉투 (B-9 · R-SE09). */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {
    private static final Logger audit = LoggerFactory.getLogger("AUDIT");
    private final SecurityResponses responses;

    public RestAuthenticationEntryPoint(SecurityResponses responses) {
        this.responses = responses;
    }

    @Override
    public void commence(HttpServletRequest req, HttpServletResponse res, AuthenticationException ex) throws IOException {
        Object attr = req.getAttribute(JwtAuthenticationFilter.ERROR_ATTR);
        ErrorCode code = attr instanceof ErrorCode c ? c : ErrorCode.UNAUTHORIZED;
        audit.warn("401 {} ip={} uri={} {}", code, req.getRemoteAddr(), req.getMethod(), req.getRequestURI());
        responses.write(res, code);
    }
}
