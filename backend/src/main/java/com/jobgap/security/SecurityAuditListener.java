package com.jobgap.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.event.AbstractAuthenticationFailureEvent;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.stereotype.Component;

/**
 * 로그인 성공·실패 감사 로그 (B-9 · R-SE09). 이 프로젝트의 로그인은 AuthenticationManager를 거치지 않으므로
 * **AuthService(BE-인증)가 이벤트를 직접 발행한다** — T-015 수용 기준:
 *   publisher.publishEvent(new AuthenticationSuccessEvent(UsernamePasswordAuthenticationToken.authenticated(email, null, List.of())));
 *   publisher.publishEvent(new AuthenticationFailureBadCredentialsEvent(UsernamePasswordAuthenticationToken.unauthenticated(email, null), new BadCredentialsException("bad")));
 */
@Component
public class SecurityAuditListener {
    private static final Logger audit = LoggerFactory.getLogger("AUDIT");

    @EventListener
    public void onSuccess(AuthenticationSuccessEvent e) {
        audit.info("LOGIN_SUCCESS account={}", PiiMasker.maskEmail(String.valueOf(e.getAuthentication().getName())));
    }

    @EventListener
    public void onFailure(AbstractAuthenticationFailureEvent e) {
        audit.warn("LOGIN_FAILURE account={} reason={}", PiiMasker.maskEmail(String.valueOf(e.getAuthentication().getName())),
                e.getException().getClass().getSimpleName());
    }
}
