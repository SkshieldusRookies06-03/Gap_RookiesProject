package com.jobgap.auth;

import com.jobgap.auth.AuthDtos.LoginRequest;
import com.jobgap.auth.AuthDtos.LoginResponse;
import com.jobgap.auth.AuthDtos.RegisterRequest;
import com.jobgap.auth.AuthDtos.TokenResponse;
import com.jobgap.auth.AuthDtos.UserResponse;
import org.springframework.stereotype.Service;

/**
 * 골격 — 오너: BE-인증. 티켓: T-015(가입·로그인·refresh·logout) · T-027(잠금 = fix(security): [S-02]).
 * 판정 테스트: src/test/java/com/jobgap/acceptance/AuthAcceptanceTest (수정 금지).
 * 쓸 것: JwtProvider(createAccessToken · newRefreshToken · sha256) · PasswordEncoder · ApplicationEventPublisher(감사 이벤트 — SecurityAuditListener 주석)
 * 만들 것: user/User 엔티티 · user/UserRepository (findByEmail · findByUuid · findByRefreshTokenHash)
 */
@Service
public class AuthService {

    public UserResponse register(RegisterRequest req) {
        throw new UnsupportedOperationException("T-015 미구현");
    }

    public LoginResponse login(LoginRequest req) {
        throw new UnsupportedOperationException("T-015 미구현");
    }

    public TokenResponse refresh(String refreshToken) {
        throw new UnsupportedOperationException("T-015 미구현");
    }

    public void logout(String userUuid) {
        throw new UnsupportedOperationException("T-015 미구현");
    }
}
