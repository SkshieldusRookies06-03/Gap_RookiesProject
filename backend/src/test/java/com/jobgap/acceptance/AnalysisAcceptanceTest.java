package com.jobgap.acceptance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

@AcceptanceTest
@DisplayName("[BE-기능 T-025·T-026·T-056] 분석 — SPEC §4.3 중계 규칙 · 점검서 B-2")
class AnalysisAcceptanceTest extends AcceptanceSupport {

    private MvcResult startStream(TestUser u, Map<String, ?> req) throws Exception {
        return mvc.perform(as(post("/api/analyses/stream"), u).contentType(MediaType.APPLICATION_JSON).content(json(req)))
                .andExpect(request().asyncStarted()).andReturn();
    }

    @Test
    @DisplayName("① 새 분석 — analysis → token(JSON 문자열) → sources → done{messageId} · USER·ASSISTANT 저장 · AI 요청에 내 uuid·REPORT")
    void newAnalysis_relaysAndSaves() throws Exception {
        TestUser me = user("an");
        long p = document(me, "JOB_POSTING", "공고", "우대: Kubernetes"), r = document(me, "RESUME", "이력서", "기술: Java");
        List<Sse> ev = readStream(startStream(me, Map.of("postingId", String.valueOf(p), "resumeId", String.valueOf(r))));

        assertThat(ev).as("이벤트가 없다 — produces text/event-stream · 중계 확인").isNotEmpty();
        assertThat(ev.get(0).event()).as("새 분석은 analysis 이벤트가 먼저").isEqualTo("analysis");
        String analysisId = om.readTree(ev.get(0).data()).get("analysisId").asText();
        assertThat(ev.stream().filter(e -> e.event().equals("token")).map(Sse::data).toList())
                .as("token data는 AI가 준 JSON 문자열 그대로").containsExactly("\"## 요구 기술\\n\"", "\"| Kubernetes | 없음 |\"");
        assertThat(ev.stream().anyMatch(e -> e.event().equals("sources"))).isTrue();
        Sse done = ev.get(ev.size() - 1);
        assertThat(done.event()).isEqualTo("done");
        assertThat(om.readTree(done.data()).path("messageId").isTextual())
                .as("AI의 done{}을 그대로 흘렸다 — 가로채서 저장 후 messageId (SPEC §4.3)").isTrue();

        List<String> roles = jdbc.queryForList("SELECT role FROM analysis_messages WHERE analysis_id = ? ORDER BY id", String.class, Long.valueOf(analysisId));
        assertThat(roles).containsExactly("USER", "ASSISTANT");
        String saved = jdbc.queryForObject("SELECT content FROM analysis_messages WHERE analysis_id = ? AND role = 'ASSISTANT'", String.class, Long.valueOf(analysisId));
        assertThat(saved).as("토큰을 이어 붙여(JSON 디코드) 저장").isEqualTo("## 요구 기술\n| Kubernetes | 없음 |");

        String aiReq = aiCalls("/internal/analyze/stream").get(0).getBody().readUtf8();
        assertThat(aiReq).contains(me.uuid()).contains("\"mode\":\"REPORT\"").contains("\"postingId\":\"" + p + "\"");
    }

    @Test
    @DisplayName("② 시작 전 검증은 스트림을 열기 전에 JSON 봉투 — 남의 문서 403 · 종류 뒤바뀜 400 · 후속에 질문 없음 400 · 없는 분석 404")
    void validation_beforeStream() throws Exception {
        TestUser me = user("val"), other = user("val2");
        long p = document(me, "JOB_POSTING", "공고", "x"), r = document(me, "RESUME", "이력서", "x");
        long op = document(other, "JOB_POSTING", "남의 공고", "x");
        mvc.perform(as(post("/api/analyses/stream"), me).contentType(MediaType.APPLICATION_JSON).accept(MediaType.TEXT_EVENT_STREAM)
                        .content(json(Map.of("postingId", String.valueOf(op), "resumeId", String.valueOf(r)))))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(as(post("/api/analyses/stream"), me).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("postingId", String.valueOf(r), "resumeId", String.valueOf(p)))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("DOCUMENT_TYPE_MISMATCH"));
        long a = analysis(me, p, r, true);
        mvc.perform(as(post("/api/analyses/stream"), me).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("analysisId", String.valueOf(a), "question", ""))))
                .andExpect(status().isBadRequest());
        mvc.perform(as(post("/api/analyses/stream"), me).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("analysisId", "987654321", "question", "질문"))))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("ANALYSIS_NOT_FOUND"));
        assertThat(aiCalls("/internal/analyze/stream")).as("검증 실패인데 AI를 불렀다").isEmpty();
    }

    @Test
    @DisplayName("③ 후속 질문 — FOLLOWUP · history는 이전 메시지(이번 질문 제외) · analysis 이벤트 없음")
    void followUp() throws Exception {
        TestUser me = user("fu");
        long p = document(me, "JOB_POSTING", "공고", "x"), r = document(me, "RESUME", "이력서", "x");
        long a = analysis(me, p, r, true);
        List<Sse> ev = readStream(startStream(me, Map.of("analysisId", String.valueOf(a), "question", "뭐부터 공부해?")));
        assertThat(ev.get(0).event()).isNotEqualTo("analysis");
        JsonNode aiReq = om.readTree(aiCalls("/internal/analyze/stream").get(0).getBody().readUtf8());
        assertThat(aiReq.get("mode").asText()).isEqualTo("FOLLOWUP");
        assertThat(aiReq.get("question").asText()).isEqualTo("뭐부터 공부해?");
        assertThat(aiReq.get("history")).as("이전 메시지 2개(질문·답변)").hasSize(2);
    }

    @Test
    @DisplayName("④ AI가 중간에 error를 보내면 그대로 흘리고 ASSISTANT는 저장하지 않는다")
    void aiError_notSaved() throws Exception {
        TestUser me = user("err");
        long p = document(me, "JOB_POSTING", "공고", "x"), r = document(me, "RESUME", "이력서", "x");
        aiStreamBody = sse("token", "\"앞부분\"") + sse("error", "{\"success\":false,\"statusCode\":503,\"code\":\"AI_UNAVAILABLE\",\"message\":\"x\",\"timestamp\":\"2026-11-06T10:00:00+09:00\"}");
        List<Sse> ev = readStream(startStream(me, Map.of("postingId", String.valueOf(p), "resumeId", String.valueOf(r))));
        assertThat(ev.get(ev.size() - 1).event()).isEqualTo("error");
        String analysisId = om.readTree(ev.get(0).data()).get("analysisId").asText();
        assertThat(jdbc.queryForList("SELECT role FROM analysis_messages WHERE analysis_id = ?", String.class, Long.valueOf(analysisId)))
                .containsExactly("USER");
    }

    @Test
    @DisplayName("⑤ AI 연결 자체가 안 되면 상태코드는 200 그대로, event: error AI_UNAVAILABLE로 끝난다")
    void aiDown_isEventError() throws Exception {
        TestUser me = user("down");
        long p = document(me, "JOB_POSTING", "공고", "x"), r = document(me, "RESUME", "이력서", "x");
        aiDown = true;
        List<Sse> ev = readStream(startStream(me, Map.of("postingId", String.valueOf(p), "resumeId", String.valueOf(r))));
        Sse last = ev.get(ev.size() - 1);
        assertThat(last.event()).isEqualTo("error");
        assertThat(om.readTree(last.data()).get("code").asText()).isEqualTo("AI_UNAVAILABLE");
    }

    @Test
    @DisplayName("⑥ [S-01] 목록 lastStatus 파생(DONE/INCOMPLETE) · 메시지 페이징 · 남의 분석 403")
    void listAndMessages() throws Exception {
        TestUser me = user("ls"), other = user("ls2");
        long p = document(me, "JOB_POSTING", "공고", "x"), r = document(me, "RESUME", "이력서", "x");
        long done = analysis(me, p, r, true);
        long cut = analysis(me, p, r, false);
        long op = document(other, "JOB_POSTING", "남공고", "x"), orr = document(other, "RESUME", "남이력서", "x");
        long theirs = analysis(other, op, orr, true);

        JsonNode list = body(mvc.perform(as(get("/api/analyses?page=0&size=20"), me)).andExpect(status().isOk()).andReturn()).get("data");
        assertThat(list.get("content")).hasSize(2);
        for (JsonNode a : list.get("content")) {
            String expect = a.get("id").asText().equals(String.valueOf(done)) ? "DONE" : "INCOMPLETE";
            assertThat(a.get("lastStatus").asText()).isEqualTo(expect);
            assertThat(a.get("postingTitle").asText()).isEqualTo("공고");
        }
        mvc.perform(as(get("/api/analyses/" + done + "/messages?page=0&size=1"), me)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].role").value("USER"))
                .andExpect(jsonPath("$.data.content[0].sources").isArray())
                .andExpect(jsonPath("$.data.page.totalElements").value(2));
        mvc.perform(as(get("/api/analyses/" + theirs + "/messages"), me)).andExpect(status().isForbidden());
        mvc.perform(as(get("/api/analyses/" + cut + "/messages"), other)).andExpect(status().isForbidden());
    }
}
