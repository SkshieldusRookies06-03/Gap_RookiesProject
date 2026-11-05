package com.jobgap.security;

import jakarta.servlet.DispatcherType;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * 보안 설정 한 곳 (오너: 기술 리드). 규칙 순서가 의미를 가진다 — 위가 먼저 일치한다.
 *
 * CSRF 비활성 사유(점검서 B-6 · 5번 명세 5.2에 그대로): 인증 정보는 쿠키가 아니라 Authorization 헤더로만 전달된다.
 * 브라우저가 교차 사이트 요청에 이 헤더를 자동으로 붙이지 않으므로 CSRF 공격 전제가 성립하지 않는다.
 * 상태 변경은 GET으로 노출하지 않는다(GET = 조회 전용).
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter,
                                    RestAuthenticationEntryPoint entryPoint, RestAccessDeniedHandler deniedHandler) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .httpBasic(b -> b.disable())
            .formLogin(f -> f.disable())
            .headers(h -> h
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'"))
                .frameOptions(f -> f.deny()))
            .authorizeHttpRequests(a -> a
                // SSE 중계: 비동기 재진입·에러 디스패치는 인가를 다시 걸지 않는다(JWT 필터가 async를 건너뛰어 401이 난다)
                .dispatcherTypeMatchers(DispatcherType.ASYNC, DispatcherType.ERROR).permitAll()
                // 헬스는 ADMIN 규칙보다 위 — 아니면 HEALTHCHECK가 401로 unhealthy
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/actuator/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login", "/api/auth/refresh").permitAll()
                .anyRequest().authenticated())
            .exceptionHandling(e -> e.authenticationEntryPoint(entryPoint).accessDeniedHandler(deniedHandler))
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /** 운영은 nginx 같은 출처라 CORS가 필요 없다 — 로컬 dev(5173 → 8080)용 Origin만 환경변수로. `*` 금지(B-7). */
    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") String origins) {
        List<String> allowed = Arrays.stream(origins.split(",")).map(String::trim).filter(o -> !o.isEmpty()).toList();
        if (allowed.stream().anyMatch(o -> o.contains("*"))) {   // 설정 실수를 기동 시점에 막는다 — 와일드카드는 B-7 위반
            throw new IllegalStateException("CORS_ALLOWED_ORIGINS에 '*'를 쓸 수 없습니다 (점검서 B-7) — Origin을 하나씩 적으세요");
        }
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(allowed);
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        c.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/api/**", c);
        return src;
    }

    /** JwtAuthenticationFilter는 @Component라 서블릿 필터로도 자동 등록된다 — 끄지 않으면 보안 체인 밖에서 먼저 돌고,
     *  체인 안에서는 "이미 실행됨"으로 건너뛰어 SecurityContext가 비어 버린다. 체인 안에서만 돌게 한다. */
    @Bean
    FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistration(JwtAuthenticationFilter filter) {
        FilterRegistrationBean<JwtAuthenticationFilter> r = new FilterRegistrationBean<>(filter);
        r.setEnabled(false);
        return r;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
