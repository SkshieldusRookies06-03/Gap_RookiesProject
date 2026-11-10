package com.jobgap.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.UUID;

/**
 * SPEC §2 users (V1__schema.sql) · 오너: BE-인증 T-015 (팀장 합의로 BE-기능이 먼저 작성)
 * 상태 변경은 엔티티 메서드로만 한다(서비스 setter 금지).
 * Refresh 회전(T-058) 및 로그인 잠금(T-027) 상태 변경을 엔티티 메서드로 처리한다.
 */
@Entity
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Getter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "uuid", nullable = false, length = 36, unique = true, columnDefinition = "CHAR(36)")
    private String uuid;

    @Column(name = "email", nullable = false, length = 100, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "name", nullable = false, length = 20)
    private String name;

    @Column(name = "role", nullable = false, length = 10)
    private String role;

    @Column(name = "failed_login_count", nullable = false)
    private int failedLoginCount;

    @Column(name = "locked_until")
    private OffsetDateTime lockedUntil;

    @Column(name = "refresh_token_hash", length = 64, columnDefinition = "CHAR(64)")
    private String refreshTokenHash;

    @Column(name = "refresh_expires_at")
    private OffsetDateTime refreshExpiresAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    /**
     * 가입 — 빌더로 받는 값은 email·passwordHash·name 셋뿐(passwordHash는 BCrypt 결과).
     * uuid·role·failedLoginCount는 여기서 정한다 — role을 빌더에 열면 가입 경로로 ADMIN을 만들 수 있다(ADMIN은 시드·수동만).
     */
    @Builder
    private User(String email, String passwordHash, String name) {
        this.uuid = UUID.randomUUID().toString();
        this.email = email;
        this.passwordHash = passwordHash;
        this.name = name;
        this.role = "USER";
        this.failedLoginCount = 0;
    }

    /** 로그인·refresh 시 새 refresh 해시로 교체 — 이전 값은 즉시 무효 */
    public void rotateRefresh(String hash, OffsetDateTime expiresAt) {
        this.refreshTokenHash = hash;
        this.refreshExpiresAt = expiresAt;
    }

    /** 로그아웃 시 저장된 refresh 해시와 만료시각을 함께 제거한다. */
    public void clearRefresh() {
        this.refreshTokenHash = null;
        this.refreshExpiresAt = null;
    }

    /** 로그인 실패 횟수 누적. 다섯 번째 실패에서는 401을 반환하면서 잠금 상태를 저장한다. */
    public boolean recordFailure(int maxFailures, java.time.Duration lockDuration) {
        this.failedLoginCount++;
        if (this.failedLoginCount >= maxFailures) {
            this.failedLoginCount = 0;
            this.lockedUntil = OffsetDateTime.now(ZoneId.of("Asia/Seoul")).plus(lockDuration);
            return true;
        }
        return false;
    }

    /** 성공하면 실패 횟수와 잠금 기록을 초기화한다. */
    public void recordSuccess() {
        this.failedLoginCount = 0;
        this.lockedUntil = null;
    }

    /** 잠긴 상태에서는 올바른 비밀번호를 입력해도 로그인할 수 없다. */
    public boolean isLocked(OffsetDateTime now) {
        return this.lockedUntil != null && this.lockedUntil.isAfter(now);
    }

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now(ZoneId.of("Asia/Seoul"));
    }

}
