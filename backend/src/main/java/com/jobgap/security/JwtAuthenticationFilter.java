package com.jobgap.security;

import com.jobgap.common.BusinessException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Authorization: Bearer → SecurityContext. 실패 사유는 request 속성으로 EntryPoint에 넘긴다(TOKEN_EXPIRED만 프론트가 refresh). */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    public static final String ERROR_ATTR = "jobgap.auth.error";
    private final JwtProvider jwtProvider;

    public JwtAuthenticationFilter(JwtProvider jwtProvider) {
        this.jwtProvider = jwtProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                AuthUser user = jwtProvider.parse(header.substring(7));
                var auth = new UsernamePasswordAuthenticationToken(user, null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + user.role())));
                var context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(auth);
                SecurityContextHolder.setContext(context);
            } catch (BusinessException e) {
                req.setAttribute(ERROR_ATTR, e.code());
            }
        }
        chain.doFilter(req, res);
    }
}
