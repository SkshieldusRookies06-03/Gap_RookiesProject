package com.jobgap.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jobgap.common.BusinessException;
import com.jobgap.common.ErrorCode;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * JWT 발급·검증 단위 — SPEC §1 인증 행 · §4.1 · 점검서 B-3·B-4. 오너: 기술 리드. DB·Spring 없이 돈다.
 * SecurityAcceptanceTest가 HTTP로 보는 401 구분을 여기서는 토큰 모양 자체로 고정한다(alg none · 다른 키 · 변조 · 만료).
 */
@DisplayName("[기술 리드 T-005] JwtProvider — HS256 · subject=uuid · 만료/위조 구분 · refresh 해시")
class JwtProviderTest {

    private static final String SECRET = "test-secret-0123456789-0123456789-abcdef";
    private static final Base64.Encoder B64URL = Base64.getUrlEncoder().withoutPadding();

    private static JwtProvider provider(String secret, long accessMs) {
        return new JwtProvider(new JwtProperties(secret, accessMs, 1_209_600_000L));
    }

    private final JwtProvider jwt = provider(SECRET, 900_000L);

    @Test
    @DisplayName("발급한 토큰을 그대로 읽으면 uuid·role이 돌아온다 · 헤더 alg는 HS256")
    void roundTrip() {
        String token = jwt.createAccessToken("3f1c-uuid", "USER");
        AuthUser me = jwt.parse(token);
        assertThat(me.uuid()).isEqualTo("3f1c-uuid");
        assertThat(me.role()).isEqualTo("USER");
        assertThat(me.isAdmin()).isFalse();

        String header = new String(Base64.getUrlDecoder().decode(token.split("\\.")[0]), StandardCharsets.UTF_8);
        assertThat(header).contains("\"alg\":\"HS256\"");
    }

    @Test
    @DisplayName("만료된 토큰은 TOKEN_EXPIRED — refresh 대상은 이것뿐 (SPEC §4.1)")
    void expiredIsTokenExpired() {
        String expired = provider(SECRET, -1_000L).createAccessToken("u", "USER");
        assertCode(() -> jwt.parse(expired), ErrorCode.TOKEN_EXPIRED);
    }

    @Test
    @DisplayName("다른 키로 서명 · 서명 변조 · 페이로드 변조 · 형식 오류 · 빈 값은 UNAUTHORIZED")
    void forgedIsUnauthorized() {
        String good = jwt.createAccessToken("victim-uuid", "USER");
        String otherKey = provider("another-secret-0123456789-0123456789-xyz", 900_000L).createAccessToken("victim-uuid", "USER");
        String[] p = good.split("\\.");
        String sigFlipped = p[0] + "." + p[1] + "." + (p[2].charAt(0) == 'A' ? "B" : "A") + p[2].substring(1);
        String adminPayload = B64URL.encodeToString("{\"sub\":\"victim-uuid\",\"role\":\"ADMIN\",\"exp\":9999999999}".getBytes(StandardCharsets.UTF_8));
        String payloadSwapped = p[0] + "." + adminPayload + "." + p[2];

        for (String bad : new String[]{otherKey, sigFlipped, payloadSwapped, "abc.def", "not-a-jwt", ""}) {
            assertCode(() -> jwt.parse(bad), ErrorCode.UNAUTHORIZED);
        }
    }

    @Test
    @DisplayName("alg none(서명 없는 토큰)으로 ADMIN을 주장해도 UNAUTHORIZED (B-3 알고리즘 혼동)")
    void algNoneIsRejected() {
        String header = B64URL.encodeToString("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = B64URL.encodeToString("{\"sub\":\"attacker\",\"role\":\"ADMIN\",\"exp\":9999999999}".getBytes(StandardCharsets.UTF_8));
        assertCode(() -> jwt.parse(header + "." + payload + "."), ErrorCode.UNAUTHORIZED);
    }

    @Test
    @DisplayName("JWT_SECRET이 32바이트 미만이면 기동을 거부한다 (B-4 · 비면 compose가 먼저 막는다)")
    void shortSecretIsRejected() {
        for (String s : new String[]{null, "", "short-secret", "x".repeat(31)}) {
            assertThatThrownBy(() -> provider(s, 900_000L)).as(String.valueOf(s))
                    .isInstanceOf(IllegalStateException.class).hasMessageContaining("32바이트");
        }
        provider("x".repeat(32), 900_000L);   // 경계 32바이트는 통과
    }

    @Test
    @DisplayName("refresh는 랜덤 32바이트(base64url 43자) · 매번 다르다 · DB에는 SHA-256 hex 64자만")
    void refreshTokenAndHash() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 200; i++) {
            String r = jwt.newRefreshToken();
            assertThat(r).hasSize(43).matches("[A-Za-z0-9_-]+");
            assertThat(seen.add(r)).as("중복 refresh").isTrue();
        }
        assertThat(JwtProvider.sha256("abc")).isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        assertThat(JwtProvider.sha256("다른 값")).hasSize(64).isNotEqualTo(JwtProvider.sha256("다른 값 "));
        assertThat(jwt.refreshTokenExpirationMs()).isEqualTo(1_209_600_000L);   // 14일 (SPEC §1)
    }

    private static void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, ErrorCode code) {
        assertThatThrownBy(call).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).code()).isEqualTo(code));
    }
}
