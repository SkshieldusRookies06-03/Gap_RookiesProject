package com.jobgap.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
 * 남의 분석 id로 메시지 조회·후속 질문, 남의 문서 id로 새 분석을 시도하면 403이고, 남의 대화가 응답에 섞이거나 늘지 않아야 한다.
 */
@AcceptanceTest
@DisplayName("[BE-기능 T-026] 분석 소유 검증 회귀 — S-01 IDOR")
class AnalysisOwnershipRegressionTest extends AcceptanceSupport {

    @Test
    @DisplayName("남의 분석 메시지·후속 질문, 남의 문서로 새 분석 → 403 FORBIDDEN · 남의 대화 노출·추가 없음 · AI 미호출")
    void otherUsersAnalysisIsForbidden() throws Exception {
        TestUser kim = user("aidor-kim"), lee = user("aidor-lee");
        long kp = document(kim, "JOB_POSTING", "kim 공고", "x"), kr = document(kim, "RESUME", "kim 이력서", "x");
        long lp = document(lee, "JOB_POSTING", "lee 공고", "x"), lr = document(lee, "RESUME", "lee 이력서", "x");
        long leeAnalysis = analysis(lee, lp, lr, true);
        jdbc.update("UPDATE analysis_messages SET content = 'lee의 비밀 질문' WHERE analysis_id = ? AND role = 'USER'", leeAnalysis);

        String body = mvc.perform(as(get("/api/analyses/" + leeAnalysis + "/messages"), kim))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).as("403 응답에 남의 대화가 섞였다").doesNotContain("lee의 비밀 질문");

        mvc.perform(as(post("/api/analyses/stream"), kim).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("analysisId", String.valueOf(leeAnalysis), "question", "남의 대화에 끼어들기"))))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(as(post("/api/analyses/stream"), kim).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("postingId", String.valueOf(kp), "resumeId", String.valueOf(lr)))))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM analysis_messages WHERE analysis_id = ?", Integer.class, leeAnalysis))
                .as("남의 분석에 메시지가 추가됐다").isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM analyses WHERE owner_id = ?", Integer.class, kim.id()))
                .as("남의 이력서로 내 분석이 만들어졌다").isZero();
        assertThat(aiCalls("/internal/analyze/stream")).as("403인데 AI를 불렀다").isEmpty();

        mvc.perform(as(get("/api/analyses/" + leeAnalysis + "/messages"), lee))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].content").value("lee의 비밀 질문"));
    }
}
