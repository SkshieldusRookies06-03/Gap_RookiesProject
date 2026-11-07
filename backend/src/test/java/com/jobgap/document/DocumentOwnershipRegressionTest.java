package com.jobgap.document;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jobgap.acceptance.AcceptanceSupport;
import com.jobgap.acceptance.AcceptanceTest;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/**
 * [S-01] IDOR 회귀 테스트 (T-026 · 점검서 B-2 · ADR-06).
 * 남의 문서 id로 조회·수정·삭제를 시도하면 403이고, 남의 데이터가 응답에 섞이거나 바뀌지 않아야 한다.
 */
@AcceptanceTest
@DisplayName("[BE-기능 T-026] 문서 소유 검증 회귀 — S-01 IDOR")
class DocumentOwnershipRegressionTest extends AcceptanceSupport {

    @Test
    @DisplayName("남의 문서 id로 상세·수정·삭제 → 403 FORBIDDEN · 본문이 응답에 없고 제목·행이 그대로")
    void otherUsersDocumentIsForbidden() throws Exception {
        TestUser kim = user("idor-kim"), lee = user("idor-lee");
        long leeDoc = document(lee, "RESUME", "lee 이력서", "lee의 비밀 본문");

        String body = mvc.perform(as(get("/api/documents/" + leeDoc), kim))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).as("403 응답에 남의 본문이 섞였다").doesNotContain("lee의 비밀 본문");

        mvc.perform(as(put("/api/documents/" + leeDoc), kim).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("title", "탈취"))))
                .andExpect(status().isForbidden());
        mvc.perform(as(delete("/api/documents/" + leeDoc), kim))
                .andExpect(status().isForbidden());

        assertThat(jdbc.queryForObject("SELECT title FROM documents WHERE id = ?", String.class, leeDoc))
                .as("남의 제목이 바뀌었다").isEqualTo("lee 이력서");

        mvc.perform(as(get("/api/documents/" + leeDoc), lee))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").value("lee의 비밀 본문"));
    }
}
