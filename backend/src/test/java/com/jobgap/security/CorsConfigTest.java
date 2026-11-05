package com.jobgap.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/** CORS 설정 회귀 — 점검서 B-7("`*` 금지"를 코드가 막는다). 오너: 기술 리드. 컨텍스트 없이 빈 메서드를 직접 부른다. */
@DisplayName("[기술 리드 T-016] CORS — 와일드카드 기동 거부 · Origin 목록")
class CorsConfigTest {

    private final SecurityConfig config = new SecurityConfig();

    @Test
    @DisplayName("CORS_ALLOWED_ORIGINS에 '*'가 섞이면 기동 시 예외 (B-7)")
    void wildcardIsRejected() {
        for (String origins : new String[]{"*", "http://localhost:5173,*", "https://*.example.com"}) {
            assertThatThrownBy(() -> config.corsConfigurationSource(origins))
                    .as(origins).isInstanceOf(IllegalStateException.class).hasMessageContaining("B-7");
        }
    }

    @Test
    @DisplayName("쉼표 목록은 공백을 걷어 Origin 하나씩 · 빈 칸은 버린다 · /api/**에만 · 자격증명 미허용")
    void originListIsParsed() {
        var src = (UrlBasedCorsConfigurationSource) config.corsConfigurationSource(" http://localhost:5173 , http://13.125.0.1:8081 ,");
        CorsConfiguration c = src.getCorsConfigurations().get("/api/**");
        assertThat(src.getCorsConfigurations()).containsOnlyKeys("/api/**");
        assertThat(c.getAllowedOrigins()).containsExactly("http://localhost:5173", "http://13.125.0.1:8081");
        assertThat(c.getAllowedHeaders()).containsExactlyInAnyOrder("Authorization", "Content-Type");
        assertThat(c.getAllowCredentials()).isFalse();
    }
}
