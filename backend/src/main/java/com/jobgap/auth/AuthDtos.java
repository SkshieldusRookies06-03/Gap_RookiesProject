package com.jobgap.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** SPEC §4.1 요청·응답 모양 = 계약. 필드 이름을 바꾸려면 SPEC부터. (오너: BE-인증) */
public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Pattern(regexp = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message = "이메일 형식이 아닙니다") @Size(max = 100) String email,
            @NotBlank @Size(min = 8, max = 64, message = "비밀번호는 8~64자입니다") String password,
            @NotBlank @Size(max = 20, message = "이름은 1~20자입니다") String name) {}

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record UserResponse(String uuid, String email, String name) {}

    public record LoginResponse(String accessToken, String refreshToken, UserResponse user) {}

    public record TokenResponse(String accessToken, String refreshToken) {}
}
