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
 * 남은 메서드: clearRefresh()(T-058) · recordFailure·recordSuccess·isLocked(T-027 — fix(security) 커밋으로 따로)
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

    @PrePersist
    void onCreate() {
        this.createdAt = OffsetDateTime.now(ZoneId.of("Asia/Seoul"));
    }

}
