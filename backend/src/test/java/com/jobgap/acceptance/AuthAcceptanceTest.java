package com.jobgap.acceptance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import tools.jackson.databind.JsonNode;
import com.jobgap.security.JwtProvider;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@AcceptanceTest
@DisplayName("[BE-인증 T-015·T-027] 인증 — SPEC §4.1 · 점검서 B-3·B-4·B-5·B-12")
class AuthAcceptanceTest extends AcceptanceSupport {

    private JsonNode login(String email, String pw, int expectStatus) throws Exception {
        return body(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", pw))))
                .andExpect(status().is(expectStatus)).andReturn());
    }

    @Test
    @DisplayName("① 가입 201 → 비밀번호는 BCrypt로 저장 · 같은 이메일 409 · 형식 오류 400 fields[]")
    void register() throws Exception {
        String email = "at-reg-" + System.nanoTime() + "@example.com";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", PW, "name", "가입자"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.uuid").isString())
                .andExpect(jsonPath("$.data.email").value(email));
        String hash = jdbc.queryForObject("SELECT password_hash FROM users WHERE email = ?", String.class, email);
        assertThat(hash).as("평문 저장이면 B-12 발견").startsWith("$2");

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", PW, "name", "가입자"))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("DUPLICATE_EMAIL"));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "not-email", "password", "1", "name", ""))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fields").isArray());
    }

    @Test
    @DisplayName("② 로그인 → access의 subject = uuid · DB에는 refresh의 SHA-256 해시만 있다")
    void login_storesOnlyHash() throws Exception {
        TestUser u = user("login");
        JsonNode d = login(u.email(), PW, 200).get("data");
        assertThat(jwt.parse(d.get("accessToken").asText()).uuid()).as("subject가 uuid가 아니면 R-SE01").isEqualTo(u.uuid());
        assertThat(d.get("user").get("uuid").asText()).isEqualTo(u.uuid());
        String refresh = d.get("refreshToken").asText();
        String stored = jdbc.queryForObject("SELECT refresh_token_hash FROM users WHERE id = ?", String.class, u.id());
        assertThat(stored).as("refresh 원문이 DB에 있으면 B-4 발견 — sha256으로 저장").isEqualTo(JwtProvider.sha256(refresh));
    }

    @Test
    @DisplayName("③ refresh 회전 — 새 값을 받고, 이전 값은 401 INVALID_REFRESH_TOKEN")
    void refresh_rotates() throws Exception {
        TestUser u = user("rot");
        String r1 = login(u.email(), PW, 200).get("data").get("refreshToken").asText();
        JsonNode d = body(mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("refreshToken", r1)))).andExpect(status().isOk()).andReturn()).get("data");
        String r2 = d.get("refreshToken").asText();
        assertThat(r2).as("회전하지 않았다").isNotEqualTo(r1);
        assertThat(d.get("accessToken").asText()).isNotBlank();
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON).content(json(Map.of("refreshToken", r1))))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    @DisplayName("④ 로그아웃하면 그 refresh는 401")
    void logout_invalidatesRefresh() throws Exception {
        TestUser u = user("out");
        JsonNode d = login(u.email(), PW, 200).get("data");
        mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + d.get("accessToken").asText()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", d.get("refreshToken").asText()))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("⑤ [S-02] 존재하는 계정 5회 실패 → 6번째는 맞는 비밀번호여도 423 ACCOUNT_LOCKED")
    void bruteForce_locks() throws Exception {
        TestUser u = user("lock");
        for (int i = 0; i < 5; i++) {
            assertThat(login(u.email(), "wrong-pass", 401).get("code").asText()).isEqualTo("INVALID_CREDENTIALS");
        }
        JsonNode locked = login(u.email(), PW, 423);
        assertThat(locked.get("code").asText()).as("잠금이 없으면 B-5 발견(S-02)").isEqualTo("ACCOUNT_LOCKED");
        assertThat(jdbc.queryForObject("SELECT locked_until FROM users WHERE id = ?", Object.class, u.id())).isNotNull();
    }

    @Test
    @DisplayName("(지킴) 없는 이메일은 몇 번을 틀려도 401 — 423이 나오면 계정 존재가 드러난다")
    void unknownEmail_neverLocks() throws Exception {
        String ghost = "at-ghost-" + System.nanoTime() + "@example.com";
        for (int i = 0; i < 6; i++) {
            assertThat(login(ghost, "wrong-pass", 401).get("code").asText()).isEqualTo("INVALID_CREDENTIALS");
        }
    }
}
