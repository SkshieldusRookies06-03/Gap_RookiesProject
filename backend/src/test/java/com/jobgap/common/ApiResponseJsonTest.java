package com.jobgap.common;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.util.TimeZone;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

/**
 * 응답 봉투 JSON 모양 — SPEC §1 응답 봉투·JSON·시간 행. 오너: 기술 리드.
 * application.yml의 spring.jackson 두 줄(write-dates-as-timestamps: false · time-zone: Asia/Seoul)과 같은 설정으로 직렬화해
 * 키·시각 형식을 고정한다. 주의: Jackson2ObjectMapperBuilder만으로는 날짜가 숫자로 나간다 — 날짜 문자열화는 Boot 자동 설정이 켠다. DB 없이 돈다.
 */
@DisplayName("[기술 리드 T-005] ApiResponse — 성공/에러 봉투 키 · data 항상 · +09:00")
class ApiResponseJsonTest {

    private final ObjectMapper om = Jackson2ObjectMapperBuilder.json()
            .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)   // = spring.jackson.serialization.write-dates-as-timestamps: false
            .timeZone(TimeZone.getTimeZone("Asia/Seoul"))                       // = spring.jackson.time-zone: Asia/Seoul
            .build();

    private JsonNode write(Object o) throws Exception {
        return om.readTree(om.writeValueAsString(o));
    }

    @Test
    @DisplayName("성공 봉투 = success·data·message·timestamp — 에러용 키(statusCode·code·fields)는 없다")
    void successShape() throws Exception {
        JsonNode j = write(ApiResponse.ok(Map.of("id", "12")));
        assertThat(j.get("success").asBoolean()).isTrue();
        assertThat(j.get("data").get("id").asText()).isEqualTo("12");
        assertThat(j.get("message").asText()).isEqualTo("요청이 완료되었습니다");
        assertThat(j.has("statusCode") || j.has("code") || j.has("fields")).isFalse();
    }

    @Test
    @DisplayName("data가 null이어도 키는 남는다 (로그아웃 data: null · 프론트는 success로만 분기)")
    void dataKeyAlwaysPresent() throws Exception {
        JsonNode ok = write(ApiResponse.ok(null, "로그아웃되었습니다"));
        assertThat(ok.has("data")).isTrue();
        assertThat(ok.get("data").isNull()).isTrue();

        JsonNode err = write(ApiResponse.error(ErrorCode.FORBIDDEN));
        assertThat(err.has("data")).isTrue();
        assertThat(err.get("data").isNull()).isTrue();
    }

    @Test
    @DisplayName("에러 봉투 = success:false · statusCode · code(enum 이름) · 기본 문구 · fields는 있을 때만")
    void errorShape() throws Exception {
        JsonNode e = write(ApiResponse.error(ErrorCode.DOCUMENT_NOT_FOUND));
        assertThat(e.get("success").asBoolean()).isFalse();
        assertThat(e.get("statusCode").asInt()).isEqualTo(404);
        assertThat(e.get("code").asText()).isEqualTo("DOCUMENT_NOT_FOUND");
        assertThat(e.get("message").asText()).isEqualTo("문서를 찾을 수 없습니다");
        assertThat(e.has("fields")).isFalse();
        assertThat(write(ApiResponse.error(ErrorCode.VALIDATION_ERROR, null, List.of())).has("fields")).as("빈 목록도 생략").isFalse();

        JsonNode v = write(ApiResponse.error(ErrorCode.VALIDATION_ERROR, null, List.of(new ApiResponse.FieldError("email", "이메일 형식이 아닙니다"))));
        assertThat(v.get("fields").get(0).get("field").asText()).isEqualTo("email");
        assertThat(v.get("fields").get(0).get("message").asText()).isEqualTo("이메일 형식이 아닙니다");
    }

    @Test
    @DisplayName("timestamp는 ISO 8601 문자열이고 +09:00 (check-api가 요구 · 숫자 배열 아님)")
    void timestampIsKstIsoString() throws Exception {
        for (JsonNode j : new JsonNode[]{write(ApiResponse.ok("x")), write(ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR))}) {
            assertThat(j.get("timestamp").isTextual()).isTrue();
            assertThat(j.get("timestamp").asText()).matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?\\+09:00");
        }
    }

    @Test
    @DisplayName("ErrorCode 표 = SPEC §4.4 — 코드별 HTTP 상태")
    void errorCodeStatuses() {
        Map<ErrorCode, Integer> expected = Map.ofEntries(
                Map.entry(ErrorCode.VALIDATION_ERROR, 400), Map.entry(ErrorCode.DOCUMENT_TYPE_MISMATCH, 400),
                Map.entry(ErrorCode.UNAUTHORIZED, 401), Map.entry(ErrorCode.TOKEN_EXPIRED, 401),
                Map.entry(ErrorCode.INVALID_CREDENTIALS, 401), Map.entry(ErrorCode.INVALID_REFRESH_TOKEN, 401),
                Map.entry(ErrorCode.FORBIDDEN, 403), Map.entry(ErrorCode.DOCUMENT_NOT_FOUND, 404),
                Map.entry(ErrorCode.ANALYSIS_NOT_FOUND, 404), Map.entry(ErrorCode.NOT_FOUND, 404),
                Map.entry(ErrorCode.DUPLICATE_EMAIL, 409), Map.entry(ErrorCode.DUPLICATE_TITLE, 409),
                Map.entry(ErrorCode.FILE_TOO_LARGE, 413), Map.entry(ErrorCode.UNSUPPORTED_FILE, 415),
                Map.entry(ErrorCode.ACCOUNT_LOCKED, 423), Map.entry(ErrorCode.INTERNAL_SERVER_ERROR, 500),
                Map.entry(ErrorCode.AI_UNAVAILABLE, 503));
        assertThat(ErrorCode.values()).hasSize(expected.size());
        for (ErrorCode c : ErrorCode.values()) {
            assertThat(c.status().value()).as(c.name()).isEqualTo(expected.get(c));
            assertThat(c.defaultMessage()).as(c.name()).isNotBlank();
        }
    }
}
