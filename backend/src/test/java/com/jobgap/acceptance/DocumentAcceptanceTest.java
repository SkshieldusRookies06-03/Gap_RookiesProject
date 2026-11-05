package com.jobgap.acceptance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@AcceptanceTest
@DisplayName("[BE-기능 T-014·T-024·T-026 · 기술 리드 T-028] 문서 — SPEC §4.2 · 점검서 B-2·B-10·A-3")
class DocumentAcceptanceTest extends AcceptanceSupport {

    @Test
    @DisplayName("① 목록 — 내 것만 · 페이지 모양 · 정렬 허용 목록 · type 필터")
    void list() throws Exception {
        TestUser me = user("list"), other = user("other");
        document(me, "JOB_POSTING", "B 공고", "본문");
        document(me, "RESUME", "A 이력서", "본문");
        document(other, "RESUME", "남의 이력서", "본문");

        JsonNode d = body(mvc.perform(as(get("/api/documents?page=0&size=20&sort=title,asc"), me))
                .andExpect(status().isOk()).andReturn()).get("data");
        assertThat(d.get("content")).as("남의 문서가 섞이면 B-2").hasSize(2);
        assertThat(d.get("content").get(0).get("title").asText()).isEqualTo("A 이력서");
        assertThat(d.get("content").get(0).get("id").isTextual()).as("id는 문자열(SPEC §1)").isTrue();
        assertThat(d.get("content").get(0).has("content")).as("목록에 본문을 싣지 않는다").isFalse();
        for (String k : new String[]{"number", "size", "totalElements", "totalPages", "first", "last", "numberOfElements"}) {
            assertThat(d.get("page").has(k)).as("page." + k).isTrue();
        }
        mvc.perform(as(get("/api/documents?type=RESUME"), me)).andExpect(jsonPath("$.data.content.length()").value(1));
        mvc.perform(as(get("/api/documents?sort=password,asc"), me)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(as(get("/api/documents?page=-1"), me)).andExpect(status().isBadRequest());
        mvc.perform(as(get("/api/documents?type=PHOTO"), me)).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("② [S-01] 상세 — 내 것 200 · 남의 것 403 FORBIDDEN · 없는 것 404")
    void detail_ownership() throws Exception {
        TestUser me = user("det"), other = user("det2");
        long mine = document(me, "RESUME", "내 이력서", "기술: Java");
        long theirs = document(other, "RESUME", "남의 이력서", "기술: Go");
        mvc.perform(as(get("/api/documents/" + mine), me)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").value("기술: Java"))
                .andExpect(jsonPath("$.data.maskedCount").isNumber());
        mvc.perform(as(get("/api/documents/" + theirs), me)).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(as(put("/api/documents/" + theirs), me).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("title", "탈취")))).andExpect(status().isForbidden());
        mvc.perform(as(delete("/api/documents/" + theirs), me)).andExpect(status().isForbidden());
        mvc.perform(as(get("/api/documents/987654321"), me)).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("DOCUMENT_NOT_FOUND"));
    }

    @Test
    @DisplayName("③ 업로드 201 → AI ingest에 내 uuid · 본문은 [S-03] 마스킹본만 · maskedCount")
    void upload_masksAndIngests() throws Exception {
        TestUser me = user("up");
        byte[] md = "기술: Java, Spring\n연락처 010-1234-5678 · kim@real.com".getBytes(StandardCharsets.UTF_8);
        JsonNode d = body(mvc.perform(as(upload("cv.md", "RESUME", "업로드 이력서", md), me))
                .andExpect(status().isCreated()).andReturn()).get("data");
        assertThat(d.get("type").asText()).isEqualTo("RESUME");

        RecordedRequest ingest = aiCalls("/internal/ingest").get(0);
        String sent = ingest.getBody().readUtf8();
        assertThat(sent).contains(me.uuid()).contains("\"docType\":\"RESUME\"");
        assertThat(sent).as("AI로 원문 연락처가 나갔다 — A-3 (S-03 · PiiMasker 연결)").doesNotContain("010-1234-5678").doesNotContain("kim@real.com");
        String stored = jdbc.queryForObject("SELECT content FROM documents WHERE owner_id = ?", String.class, me.id());
        assertThat(stored).as("DB에 원문이 저장됐다 — ADR-04").doesNotContain("010-1234-5678");
        assertThat(jdbc.queryForObject("SELECT masked_count FROM documents WHERE owner_id = ?", Integer.class, me.id())).isEqualTo(2);
    }

    @Test
    @DisplayName("④ 업로드 거절 — .exe 415 · 빈 파일 400 · 200KB 초과 413 · 같은 제목 409 (전부 봉투)")
    void upload_rejects() throws Exception {
        TestUser me = user("rej");
        mvc.perform(as(upload("x.exe", "RESUME", "exe", "MZ".getBytes()), me)).andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_FILE"));
        mvc.perform(as(upload("e.md", "RESUME", "empty", new byte[0]), me)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(as(upload("big.txt", "RESUME", "big", new byte[300 * 1024]), me)).andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.code").value("FILE_TOO_LARGE"));
        document(me, "RESUME", "중복", "본문");
        mvc.perform(as(upload("d.md", "RESUME", "중복", "본문".getBytes(StandardCharsets.UTF_8)), me)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_TITLE"));
        mvc.perform(as(upload("k.txt", "RESUME", "euckr", new byte[]{(byte) 0xB0, (byte) 0xA1, (byte) 0xC0}), me))
                .andExpect(status().isUnsupportedMediaType());   // UTF-8 아님
    }

    @Test
    @DisplayName("⑤ AI가 죽어 있으면 업로드는 503 AI_UNAVAILABLE이고 DB에 행이 남지 않는다")
    void upload_aiDown() throws Exception {
        TestUser me = user("down");
        aiDown = true;
        mvc.perform(as(upload("a.md", "RESUME", "죽은 AI", "본문".getBytes(StandardCharsets.UTF_8)), me))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("AI_UNAVAILABLE"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM documents WHERE owner_id = ?", Integer.class, me.id()))
                .as("AI 실패 후 행이 남았다 — SPEC §1 업로드 순서").isZero();
    }

    @Test
    @DisplayName("⑥ 제목 수정 200 · 빈 제목 400 · 다른 내 문서와 같은 제목 409")
    void updateTitle() throws Exception {
        TestUser me = user("put");
        long id = document(me, "RESUME", "원래", "본문");
        document(me, "RESUME", "다른 것", "본문");
        mvc.perform(as(put("/api/documents/" + id), me).contentType(MediaType.APPLICATION_JSON).content(json(Map.of("title", "바꿈"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.title").value("바꿈"));
        mvc.perform(as(put("/api/documents/" + id), me).contentType(MediaType.APPLICATION_JSON).content(json(Map.of("title", ""))))
                .andExpect(status().isBadRequest());
        mvc.perform(as(put("/api/documents/" + id), me).contentType(MediaType.APPLICATION_JSON).content(json(Map.of("title", "다른 것"))))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("⑦ 삭제 — AI DELETE(내 uuid) → 그 문서를 쓴 분석·메시지 → 문서 순서 · AI 실패면 503이고 그대로")
    void delete_order() throws Exception {
        TestUser me = user("del");
        long p = document(me, "JOB_POSTING", "공고", "본문"), r = document(me, "RESUME", "이력서", "본문");
        long a = analysis(me, p, r, true);

        aiDown = true;
        mvc.perform(as(delete("/api/documents/" + p), me)).andExpect(status().isServiceUnavailable());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM documents WHERE id = ?", Integer.class, p)).as("AI 실패인데 지웠다").isEqualTo(1);

        aiDown = false;
        mvc.perform(as(delete("/api/documents/" + p), me)).andExpect(status().isOk());
        RecordedRequest del = aiCalls("/internal/documents/" + p).get(aiCalls("/internal/documents/" + p).size() - 1);
        assertThat(del.getMethod()).isEqualTo("DELETE");
        assertThat(del.getPath()).contains("ownerUuid=" + me.uuid());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM analyses WHERE id = ?", Integer.class, a)).as("분석이 남으면 FK 500").isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM documents WHERE id = ?", Integer.class, p)).isZero();
    }
}
