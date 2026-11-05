package com.jobgap.acceptance;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;

@AcceptanceTest
@DisplayName("[기술 리드 T-005·T-016] 보안 설정 — 점검서 B-3·B-7·B-8 · F-3 · R-SE02·06·08")
class SecurityAcceptanceTest extends AcceptanceSupport {

    @Value("${app.jwt.secret}") String secret;

    @Test
    @DisplayName("(지킴) /actuator/health는 토큰 없이 200 · /actuator/metrics는 USER 토큰으로 403 봉투")
    void actuator() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mvc.perform(as(get("/actuator/metrics"), user("act"))).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("(지킴) 토큰 없음 401 UNAUTHORIZED · 만료 401 TOKEN_EXPIRED · 위조 401 UNAUTHORIZED — 전부 봉투")
    void tokens() throws Exception {
        mvc.perform(get("/api/documents")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false)).andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        String expired = Jwts.builder().subject("x").claim("role", "USER").expiration(new Date(System.currentTimeMillis() - 1000))
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)), Jwts.SIG.HS256).compact();
        mvc.perform(get("/api/documents").header("Authorization", "Bearer " + expired)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("TOKEN_EXPIRED"));
        String forged = Jwts.builder().subject("x").claim("role", "ADMIN")
                .signWith(Keys.hmacShaKeyFor("another-secret-0123456789abcdef0123456789".getBytes(StandardCharsets.UTF_8)), Jwts.SIG.HS256).compact();
        mvc.perform(get("/api/documents").header("Authorization", "Bearer " + forged)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("(지킴) API 응답에 CSP default-src 'none' · 없는 경로는 404 봉투(Spring 기본 에러 JSON 아님)")
    void headersAndErrors() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(header().string("Content-Security-Policy", org.hamcrest.Matchers.containsString("default-src 'none'")));
        mvc.perform(as(get("/api/nope"), user("nf"))).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false)).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
