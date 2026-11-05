package com.jobgap.security;

import com.jobgap.common.BusinessException;
import com.jobgap.common.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;
import java.util.HexFormat;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

/**
 * JWT 발급·검증 + Refresh 해시 (B-3 · B-4). 오너: 기술 리드.
 * - subject = 사용자 uuid · 클레임 role · 알고리즘 HS256 고정(키 길이로 자동 선택되지 않게 명시)
 * - Refresh는 JWT가 아니라 랜덤 32바이트 문자열 — DB에는 SHA-256 해시만 저장한다(users.refresh_token_hash)
 */
@Component
public class JwtProvider {
    private final SecretKey key;
    private final JwtProperties props;
    private final SecureRandom random = new SecureRandom();

    public JwtProvider(JwtProperties props) {
        if (props.secret() == null || props.secret().getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET는 32바이트 이상이어야 합니다 (.env 확인)");
        }
        this.props = props;
        this.key = Keys.hmacShaKeyFor(props.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(String uuid, String role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(uuid)
                .claim("role", role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + props.accessTokenExpiration()))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /** 만료 → TOKEN_EXPIRED · 그 밖의 서명·형식 오류 → UNAUTHORIZED */
    public AuthUser parse(String token) {
        try {
            Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return new AuthUser(c.getSubject(), c.get("role", String.class));
        } catch (ExpiredJwtException e) {
            throw new BusinessException(ErrorCode.TOKEN_EXPIRED);
        } catch (JwtException | IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
    }

    public String newRefreshToken() {
        byte[] b = new byte[32];
        random.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    public long refreshTokenExpirationMs() {
        return props.refreshTokenExpiration();
    }

    /** SHA-256 hex (64자) — users.refresh_token_hash CHAR(64) */
    public static String sha256(String value) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
