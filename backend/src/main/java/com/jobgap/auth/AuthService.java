package com.jobgap.auth;

import com.jobgap.auth.AuthDtos.LoginRequest;
import com.jobgap.auth.AuthDtos.LoginResponse;
import com.jobgap.auth.AuthDtos.RegisterRequest;
import com.jobgap.auth.AuthDtos.TokenResponse;
import com.jobgap.auth.AuthDtos.UserResponse;
import com.jobgap.common.BusinessException;
import com.jobgap.common.ErrorCode;
import com.jobgap.security.JwtProvider;
import com.jobgap.security.AuditLog;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.event.AuthenticationFailureBadCredentialsEvent;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** T-015 가입/로그인 · T-058 refresh/로그아웃 · T-027 로그인 잠금. */
@Service
public class AuthService {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final ApplicationEventPublisher events;

    @Value("${app.login.max-failures:5}")
    private int maxFailures;

    @Value("${app.login.lock-minutes:15}")
    private int lockMinutes;

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

    // 실패 401에서 DB의 실패 횟수가 롤백되지 않아야 한다.
    @Transactional(noRollbackFor = BusinessException.class)
    public LoginResponse login(LoginRequest req) {
        String email = req.email().trim().toLowerCase(java.util.Locale.ROOT);
        User user = userRepository.findByEmail(email).orElse(null);

        // 없는 계정에서는 423을 반환하지 않아 계정 존재 여부를 노출하지 않는다.
        if (user == null) {
            audit(email, false);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        OffsetDateTime now = OffsetDateTime.now(SEOUL);
        // 먼저 잠금 확인: 맞는 비밀번호도 15분 동안 423.
        if (user.isLocked(now)) {
            throw new BusinessException(ErrorCode.ACCOUNT_LOCKED,
                    "로그인 5회 실패로 잠겼습니다. 해제: " + user.getLockedUntil().toLocalTime());
        }

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            boolean lockedNow = user.recordFailure(maxFailures, Duration.ofMinutes(lockMinutes));
            if (lockedNow) {
                AuditLog.locked(user.getEmail());
            }
            audit(email, false);
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        user.recordSuccess();
        String access = jwtProvider.createAccessToken(user.getUuid(), user.getRole());
        String refresh = jwtProvider.newRefreshToken();
        user.rotateRefresh(JwtProvider.sha256(refresh),
                now.plus(Duration.ofMillis(jwtProvider.refreshTokenExpirationMs())));
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

    /** 유효한 refresh로 재발급하고, DB의 해시를 교체해 이전 토큰을 즉시 무효화한다. */
    @Transactional
    public TokenResponse refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        String hash = JwtProvider.sha256(refreshToken);
        User user = userRepository.findByRefreshTokenHash(hash)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));

        OffsetDateTime now = OffsetDateTime.now(SEOUL);
        if (user.getRefreshExpiresAt() == null || !user.getRefreshExpiresAt().isAfter(now)) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        String newRefresh = jwtProvider.newRefreshToken();
        user.rotateRefresh(JwtProvider.sha256(newRefresh),
                now.plus(Duration.ofMillis(jwtProvider.refreshTokenExpirationMs())));
        String newAccess = jwtProvider.createAccessToken(user.getUuid(), user.getRole());
        return new TokenResponse(newAccess, newRefresh);
    }

    /** 현재 로그인 사용자의 refresh를 폐기한다. Access JWT는 원래 만료시각까지 유효하다. */
    @Transactional
    public void logout(String userUuid) {
        userRepository.findByUuid(userUuid).ifPresent(User::clearRefresh);
    }
}
