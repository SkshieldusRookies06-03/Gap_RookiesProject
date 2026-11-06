package com.jobgap.acceptance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import tools.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

/**
 * 경계값 판정 테스트 — 기존 판정 테스트가 짚지 않은 SPEC 숫자·규칙을 한 곳에 (오너: 기술 리드 · 이 파일은 구현자가 고치지 않는다).
 * 대상: §1 페이지·업로드·질문/제목·JSON 시간 · §4.2 MIME · §4.3 AI 요청 본문 · 후속 문맥 6개 · 분석 제목 100자 · §6.5 마스킹(제목·질문).
 * 각 테스트 이름의 [T-###]가 green으로 만드는 티켓이다.
 */
@AcceptanceTest
@DisplayName("[기술 리드] 경계값 — SPEC §1 · §4 · §6.5 숫자 규칙")
class BoundaryAcceptanceTest extends AcceptanceSupport {

    private static final int KB200 = 200 * 1024;

    private static MockMultipartHttpServletRequestBuilder uploadAs(String filename, String contentType, String title, byte[] bytes) {
        return multipart("/api/documents")
                .file(new MockMultipartFile("file", filename, contentType, bytes))
                .param("type", "RESUME").param("title", title);
    }

    private MvcResult startStream(TestUser u, Map<String, ?> req) throws Exception {
        return mvc.perform(as(post("/api/analyses/stream"), u).contentType(MediaType.APPLICATION_JSON).content(json(req)))
                .andExpect(request().asyncStarted()).andReturn();
    }

    private JsonNode lastAiStreamRequest() throws Exception {
        var calls = aiCalls("/internal/analyze/stream");
        assertThat(calls).as("AI 스트림을 부르지 않았다").isNotEmpty();
        return om.readTree(calls.get(calls.size() - 1).getBody().readUtf8());
    }

    // ── §1 페이지 행 ────────────────────────────────────────────

    @Test
    @DisplayName("[T-014·T-056] 페이지 — size>50은 50으로 · size<1·정수 아님은 400 봉투 · 목록 셋 모두 같은 규칙")
    void paging() throws Exception {
        TestUser me = user("page");
        long p = document(me, "JOB_POSTING", "공고", "x"), r = document(me, "RESUME", "이력서", "x");
        long a = analysis(me, p, r, true);

        mvc.perform(as(get("/api/documents?size=100"), me)).andExpect(status().isOk()).andExpect(jsonPath("$.data.page.size").value(50));
        mvc.perform(as(get("/api/analyses?size=51"), me)).andExpect(status().isOk()).andExpect(jsonPath("$.data.page.size").value(50));
        mvc.perform(as(get("/api/analyses/" + a + "/messages?size=999"), me)).andExpect(status().isOk()).andExpect(jsonPath("$.data.page.size").value(50));

        for (String bad : new String[]{"/api/documents?size=0", "/api/documents?page=abc", "/api/documents?size=1.5",
                "/api/analyses?page=-1", "/api/analyses?size=0", "/api/analyses/" + a + "/messages?page=-1"}) {
            mvc.perform(as(get(bad), me)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false)).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }
    }

    // ── §1 JSON · 시간 행 ───────────────────────────────────────

    @Test
    @DisplayName("[T-014·T-012] 응답 시각은 +09:00 — 봉투 timestamp · createdAt (check-api가 요구)")
    void timesAreKst() throws Exception {
        TestUser me = user("kst");
        document(me, "RESUME", "이력서", "x");
        JsonNode b = body(mvc.perform(as(get("/api/documents"), me)).andExpect(status().isOk()).andReturn());
        assertThat(b.get("timestamp").asText()).endsWith("+09:00");
        assertThat(b.get("data").get("content").get(0).get("createdAt").asText()).as("DB 시각이 UTC로 나간다 — time_zone 설정")
                .endsWith("+09:00");
    }

    // ── §1 업로드 행 · §4.2 ─────────────────────────────────────

    @Test
    @DisplayName("[T-024] 업로드 판정은 확장자(대소문자 무시) — MIME은 허용 목록·빈 값·octet-stream 통과 · 그 밖 415")
    void uploadExtensionAndMime() throws Exception {
        TestUser me = user("mime");
        byte[] txt = "기술: Java".getBytes(StandardCharsets.UTF_8);
        mvc.perform(as(uploadAs("a.md", "application/octet-stream", "md-octet", txt), me)).andExpect(status().isCreated());
        mvc.perform(as(uploadAs("b.md", "text/x-markdown", "md-x", txt), me)).andExpect(status().isCreated());
        mvc.perform(as(uploadAs("c.txt", "", "txt-empty-mime", txt), me)).andExpect(status().isCreated());
        mvc.perform(as(uploadAs("CV.MD", "text/markdown", "upper-ext", txt), me)).andExpect(status().isCreated());

        for (String[] bad : new String[][]{{"d.txt", "image/png"}, {"e.md.exe", "application/octet-stream"}, {"f.pdf", "application/pdf"},
                {"g", "text/plain"}, {"h.markdown", "text/markdown"}}) {
            mvc.perform(as(uploadAs(bad[0], bad[1], "bad-" + bad[0], txt), me)).andExpect(status().isUnsupportedMediaType())
                    .andExpect(jsonPath("$.code").value("UNSUPPORTED_FILE"));
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM documents WHERE owner_id = ?", Integer.class, me.id())).isEqualTo(4);
    }

    @Test
    @DisplayName("[T-024] 크기 경계 — 정확히 200KB는 201 · 200KB+1바이트는 413 봉투(서비스가 getSize()로 직접 검사)")
    void uploadSizeBoundary() throws Exception {
        TestUser me = user("size");
        byte[] exact = new byte[KB200];
        Arrays.fill(exact, (byte) 'a');
        byte[] over = Arrays.copyOf(exact, KB200 + 1);
        over[KB200] = 'a';
        mvc.perform(as(uploadAs("exact.txt", "text/plain", "정확히 200KB", exact), me)).andExpect(status().isCreated());
        mvc.perform(as(uploadAs("over.txt", "text/plain", "200KB 초과", over), me)).andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.code").value("FILE_TOO_LARGE"));
    }

    @Test
    @DisplayName("[T-024] 제목은 1~100자 — 101자·공백만은 400 · 100자는 통과")
    void uploadTitleLength() throws Exception {
        TestUser me = user("tlen");
        byte[] txt = "x".getBytes(StandardCharsets.UTF_8);
        mvc.perform(as(uploadAs("a.txt", "text/plain", "가".repeat(100), txt), me)).andExpect(status().isCreated());
        mvc.perform(as(uploadAs("b.txt", "text/plain", "가".repeat(101), txt), me)).andExpect(status().isBadRequest());
        mvc.perform(as(uploadAs("c.txt", "text/plain", "   ", txt), me)).andExpect(status().isBadRequest());
    }

    // ── §6.5 마스킹 — 제목·질문 (S-03 · SPEC §1 질문·제목 행) ─────────

    @Test
    @DisplayName("[T-028] 업로드·수정 제목도 마스킹해 저장 · 마스킹 후 같아진 제목은 500이 아니라 409")
    void titlesAreMasked() throws Exception {
        TestUser me = user("tmask");
        byte[] txt = "x".getBytes(StandardCharsets.UTF_8);
        JsonNode d = body(mvc.perform(as(uploadAs("a.txt", "text/plain", "연락처 010-1111-2222", txt), me))
                .andExpect(status().isCreated()).andReturn()).get("data");
        assertThat(d.get("title").asText()).isEqualTo("연락처 010-****-****");
        assertThat(jdbc.queryForObject("SELECT title FROM documents WHERE owner_id = ?", String.class, me.id()))
                .as("제목 원문이 DB에 — A-3").doesNotContain("1111-2222");
        assertThat(aiCalls("/internal/ingest").get(0).getBody().readUtf8()).as("AI로 제목 원문이 나갔다").doesNotContain("1111-2222");

        mvc.perform(as(uploadAs("b.txt", "text/plain", "연락처 010-3333-4444", txt), me))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("DUPLICATE_TITLE"));

        long id = document(me, "RESUME", "수정 대상", "x");
        mvc.perform(as(put("/api/documents/" + id), me).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("title", "메일 kim.rookie@gmail.com")))).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT title FROM documents WHERE id = ?", String.class, id)).doesNotContain("kim.rookie");
    }

    @Test
    @DisplayName("[T-028] 후속 질문도 마스킹 — DB의 USER 메시지와 AI로 가는 question 모두")
    void questionIsMasked() throws Exception {
        TestUser me = user("qmask");
        long p = document(me, "JOB_POSTING", "공고", "x"), r = document(me, "RESUME", "이력서", "x");
        long a = analysis(me, p, r, true);
        readStream(startStream(me, Map.of("analysisId", String.valueOf(a), "question", "제 번호 010-9876-5432 로 연락 가능한 회사?")));
        String saved = jdbc.queryForObject("SELECT content FROM analysis_messages WHERE analysis_id = ? AND role = 'USER' ORDER BY id DESC LIMIT 1",
                String.class, a);
        assertThat(saved).doesNotContain("9876-5432").contains("010-****-****");
        assertThat(lastAiStreamRequest().get("question").asText()).doesNotContain("9876-5432");
    }

    // ── §4.3 · §6.2 AI 요청 본문 ───────────────────────────────

    @Test
    @DisplayName("[T-025] 새 분석의 AI 요청에 null이 없다 — question \"\" · history [] · postingTitle 문자열 (AI pydantic이 null을 400으로 거부)")
    void reportRequestHasNoNulls() throws Exception {
        TestUser me = user("nonull");
        long p = document(me, "JOB_POSTING", "카카오 백엔드 신입 공고", "x"), r = document(me, "RESUME", "이력서", "x");
        readStream(startStream(me, Map.of("postingId", String.valueOf(p), "resumeId", String.valueOf(r))));
        JsonNode req = lastAiStreamRequest();
        for (String k : new String[]{"ownerUuid", "postingId", "resumeId", "postingTitle", "mode", "question", "history"}) {
            assertThat(req.has(k) && !req.get(k).isNull()).as("AI 요청 " + k + " 누락/null").isTrue();
        }
        assertThat(req.get("question").isTextual()).isTrue();
        assertThat(req.get("question").asText()).isEmpty();
        assertThat(req.get("history").isArray()).isTrue();
        assertThat(req.get("history")).isEmpty();
        assertThat(req.get("postingTitle").asText()).isEqualTo("카카오 백엔드 신입 공고");
        assertThat(req.get("resumeId").isTextual()).as("id는 문자열").isTrue();
    }

    @Test
    @DisplayName("[T-025] 후속 문맥은 최근 6개만 · 오래된 순 · 이번 질문은 history에 넣지 않는다 (SPEC §1 후속 질문 문맥)")
    void historyIsLastSix() throws Exception {
        TestUser me = user("hist");
        long p = document(me, "JOB_POSTING", "공고", "x"), r = document(me, "RESUME", "이력서", "x");
        long a = analysis(me, p, r, true);   // m0(USER '질문') · m1(ASSISTANT '답변')
        for (int i = 2; i < 10; i++) {
            jdbc.update("INSERT INTO analysis_messages (analysis_id, role, content, sources, created_at) VALUES (?,?,?, '[]', NOW(6))",
                    a, i % 2 == 0 ? "USER" : "ASSISTANT", "m" + i);
        }
        readStream(startStream(me, Map.of("analysisId", String.valueOf(a), "question", "이번 질문")));
        JsonNode history = lastAiStreamRequest().get("history");
        assertThat(history).hasSize(6);
        List<String> contents = new java.util.ArrayList<>();
        history.forEach(h -> contents.add(h.get("content").asText()));
        assertThat(contents).containsExactly("m4", "m5", "m6", "m7", "m8", "m9");
        assertThat(history.get(0).get("role").asText()).isEqualTo("USER");
        assertThat(contents).doesNotContain("이번 질문");
    }

    @Test
    @DisplayName("[T-025] 질문 1000자는 통과 · 1001자는 400이고 AI를 부르지 않는다")
    void questionLength() throws Exception {
        TestUser me = user("qlen");
        long p = document(me, "JOB_POSTING", "공고", "x"), r = document(me, "RESUME", "이력서", "x");
        long a = analysis(me, p, r, true);
        mvc.perform(as(post("/api/analyses/stream"), me).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("analysisId", String.valueOf(a), "question", "가".repeat(1001)))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        assertThat(aiCalls("/internal/analyze/stream")).isEmpty();
        readStream(startStream(me, Map.of("analysisId", String.valueOf(a), "question", "가".repeat(1000))));
        assertThat(aiCalls("/internal/analyze/stream")).hasSize(1);
    }

    @Test
    @DisplayName("[T-025] 분석 제목 = 공고 제목 × 이력서 제목, 100자에서 자른다 (analyses.title VARCHAR(100))")
    void analysisTitleIsTruncated() throws Exception {
        TestUser me = user("atitle");
        String pt = "공".repeat(100), rt = "이".repeat(100);
        long p = document(me, "JOB_POSTING", pt, "x"), r = document(me, "RESUME", rt, "x");
        List<Sse> ev = readStream(startStream(me, Map.of("postingId", String.valueOf(p), "resumeId", String.valueOf(r))));
        assertThat(ev).isNotEmpty();
        assertThat(ev.get(ev.size() - 1).event()).as("긴 제목 저장에서 스트림이 깨졌다").isEqualTo("done");
        String title = jdbc.queryForObject("SELECT title FROM analyses WHERE owner_id = ?", String.class, me.id());
        assertThat(title).hasSizeLessThanOrEqualTo(100).startsWith("공공공");
    }

    // ── §4.1 가입 검증 ──────────────────────────────────────────

    @Test
    @DisplayName("[T-015] 가입 검증 — 이름 공백·21자 · 비밀번호 7자·65자 · 이메일 형식 → 400 fields[]에 그 필드")
    void registerValidation() throws Exception {
        Object[][] cases = {
                {Map.of("email", "at-v1@example.com", "password", "Passw0rd!", "name", "   "), "name"},
                {Map.of("email", "at-v2@example.com", "password", "Passw0rd!", "name", "가".repeat(21)), "name"},
                {Map.of("email", "at-v3@example.com", "password", "short7!", "name", "김"), "password"},
                {Map.of("email", "at-v4@example.com", "password", "p".repeat(65), "name", "김"), "password"},
                {Map.of("email", "not-an-email", "password", "Passw0rd!", "name", "김"), "email"},
        };
        for (Object[] c : cases) {
            JsonNode b = body(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json(c[0])))
                    .andExpect(status().isBadRequest()).andReturn());
            assertThat(b.get("code").asText()).isEqualTo("VALIDATION_ERROR");
            List<String> fields = new java.util.ArrayList<>();
            b.get("fields").forEach(f -> fields.add(f.get("field").asText()));
            assertThat(fields).as(c[0].toString()).contains((String) c[1]);
        }
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "at-v5@example.com", "password", "p".repeat(64), "name", "가".repeat(20)))))
                .andExpect(status().isCreated());   // 경계값 64자·20자는 통과
    }
}
