package com.jobgap.security;

/** 인증 주체 — JWT에서 꺼낸 값만 담는다. 컨트롤러: @AuthenticationPrincipal AuthUser me (프론트가 보낸 uuid는 쓰지 않는다 · B-2). */
public record AuthUser(String uuid, String role) {
    public boolean isAdmin() { return "ADMIN".equals(role); }
}
