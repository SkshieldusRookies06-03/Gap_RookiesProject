package com.jobgap.auth;

import com.jobgap.auth.AuthDtos.LoginRequest;
import com.jobgap.auth.AuthDtos.LoginResponse;
import com.jobgap.auth.AuthDtos.RefreshRequest;
import com.jobgap.auth.AuthDtos.RegisterRequest;
import com.jobgap.auth.AuthDtos.TokenResponse;
import com.jobgap.auth.AuthDtos.UserResponse;
import com.jobgap.common.ApiResponse;
import com.jobgap.security.AuthUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** SPEC §4.1 — 시그니처는 계약(골격). 구현은 AuthService (T-015 · BE-인증). */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ApiResponse.ok(authService.register(req), "회원가입이 완료되었습니다");
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        return ApiResponse.ok(authService.login(req), "로그인되었습니다");
    }

    @PostMapping("/refresh")
    public ApiResponse<TokenResponse> refresh(@Valid @RequestBody RefreshRequest req) {
        return ApiResponse.ok(authService.refresh(req.refreshToken()), "토큰이 재발급되었습니다");
    }

    @PostMapping("/logout")
    @PreAuthorize("hasAnyAuthority('ROLE_USER','ROLE_ADMIN')")
    public ApiResponse<Void> logout(@AuthenticationPrincipal AuthUser me) {
        authService.logout(me.uuid());
        return ApiResponse.ok(null, "로그아웃되었습니다");
    }
}
