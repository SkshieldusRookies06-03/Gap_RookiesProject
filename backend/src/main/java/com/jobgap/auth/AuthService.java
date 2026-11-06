package com.jobgap.auth;

import com.jobgap.auth.AuthDtos.LoginRequest;
import com.jobgap.auth.AuthDtos.LoginResponse;
import com.jobgap.auth.AuthDtos.RegisterRequest;
import com.jobgap.auth.AuthDtos.TokenResponse;
import com.jobgap.auth.AuthDtos.UserResponse;
import com.jobgap.common.BusinessException;
import com.jobgap.common.ErrorCode;
import com.jobgap.security.JwtProvider;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.event.AuthenticationFailureBadCredentialsEvent;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** T-015: registration, login, and login audit events. T-058/T-027 remain separate tickets. */
@Service
public class AuthService {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final ApplicationEventPublisher events;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
                       JwtProvider jwtProvider, ApplicationEventPublisher events) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
        this.events = events;
    }

    @Transactional
    public UserResponse register(RegisterRequest req) {
        // Email identity is case-insensitive across registration and login.
        String email = req.email().trim().toLowerCase(java.util.Locale.ROOT);
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(req.password()))
                .name(req.name())
                .build();
        User saved = userRepository.saveAndFlush(user);
        return toResponse(saved);
    }

    // A failed-login transaction must not roll back once T-027 adds failure counters.
    @Transactional(noRollbackFor = BusinessException.class)
    public LoginResponse login(LoginRequest req) {
        String email = req.email().trim().toLowerCase(java.util.Locale.ROOT);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            audit(email, false);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        String access = jwtProvider.createAccessToken(user.getUuid(), user.getRole());
        String refresh = jwtProvider.newRefreshToken();
        user.rotateRefresh(JwtProvider.sha256(refresh),
                OffsetDateTime.now(SEOUL).plus(Duration.ofMillis(jwtProvider.refreshTokenExpirationMs())));
        audit(email, true);
        return new LoginResponse(access, refresh, toResponse(user));
    }

    private static UserResponse toResponse(User user) {
        return new UserResponse(user.getUuid(), user.getEmail(), user.getName());
    }

    private void audit(String email, boolean success) {
        if (success) {
            events.publishEvent(new AuthenticationSuccessEvent(
                    UsernamePasswordAuthenticationToken.authenticated(email, null, List.of())));
        } else {
            events.publishEvent(new AuthenticationFailureBadCredentialsEvent(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, null),
                    new BadCredentialsException("bad credentials")));
        }
    }

    // Reserved for T-058. Keep this ticket separate to preserve the scope/line-count gate.
    public TokenResponse refresh(String refreshToken) {
        throw new UnsupportedOperationException("T-058 미구현");
    }

    public void logout(String userUuid) {
        throw new UnsupportedOperationException("T-058 미구현");
    }
}
