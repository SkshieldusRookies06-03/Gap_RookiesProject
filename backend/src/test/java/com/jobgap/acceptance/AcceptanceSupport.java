package com.jobgap.acceptance;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.jobgap.security.JwtProvider;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import okhttp3.mockwebserver.SocketPolicy;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

/**
 * 판정 테스트 공통 도우미 (오너: 기술 리드).
 * - 데이터는 테스트마다 JDBC로 직접 만든다(시드·엔티티 클래스에 기대지 않는다 — 구현 전에도 컴파일된다).
 * - 이메일이 at- 로 시작하는 사용자와 그 데이터는 테스트가 끝날 때 지운다.
 * - AI 모듈은 MockWebServer가 흉내낸다(SPEC §6 이벤트 그대로). aiDown = true면 연결을 끊는다.
 */
public abstract class AcceptanceSupport {
    protected static final String PW = "Passw0rd!";
    protected static final String AI_TOKEN = "test-internal-token";
    protected static final MockWebServer AI = new MockWebServer();
    protected static final ConcurrentLinkedQueue<RecordedRequest> AI_CALLS = new ConcurrentLinkedQueue<>();
    protected static volatile boolean aiDown = false;
    protected static volatile String aiStreamBody = defaultStream();

    static {
        AI.setDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest req) {
                AI_CALLS.add(req);
                if (aiDown) return new MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AFTER_REQUEST);
                if (!AI_TOKEN.equals(req.getHeader("X-Internal-Token"))) return new MockResponse().setResponseCode(401);
                String path = req.getPath() == null ? "" : req.getPath();
                if (path.startsWith("/internal/ingest")) {
                    return json(201, "{\"documentId\":\"x\",\"chunks\":1}");
                }
                if (path.startsWith("/internal/documents/")) return new MockResponse().setResponseCode(204);
                if (path.startsWith("/internal/analyze/stream")) {
                    return new MockResponse().setResponseCode(200).setHeader("Content-Type", "text/event-stream").setBody(aiStreamBody);
                }
                return new MockResponse().setResponseCode(404);
            }
        });
        try { AI.start(); } catch (Exception e) { throw new IllegalStateException(e); }
    }

    /** 컨텍스트만 필요한 테스트용 — AI 주소 주입만 한다 */
    public abstract static class AiStubOnly {
        @DynamicPropertySource
        static void aiProps(DynamicPropertyRegistry r) {
            r.add("app.ai.base-url", () -> "http://127.0.0.1:" + AI.getPort());
        }
    }

    @DynamicPropertySource
    static void aiProps(DynamicPropertyRegistry r) {
        r.add("app.ai.base-url", () -> "http://127.0.0.1:" + AI.getPort());
    }

    @Autowired protected MockMvc mvc;
    @Autowired protected JdbcTemplate jdbc;
    @Autowired protected JwtProvider jwt;
    @Autowired protected PasswordEncoder encoder;
    @Autowired protected ObjectMapper om;

    @BeforeEach
    void resetAi() {
        AI_CALLS.clear();
        aiDown = false;
        aiStreamBody = defaultStream();
    }

    @AfterEach
    void cleanUp() {
        String mine = "SELECT id FROM users WHERE email LIKE 'at-%'";
        jdbc.update("DELETE FROM analysis_messages WHERE analysis_id IN (SELECT id FROM analyses WHERE owner_id IN (" + mine + "))");
        jdbc.update("DELETE FROM analyses WHERE owner_id IN (" + mine + ")");
        jdbc.update("DELETE FROM documents WHERE owner_id IN (" + mine + ")");
        jdbc.update("DELETE FROM users WHERE email LIKE 'at-%'");
    }

    // ── 데이터 ─────────────────────────────────────────────
    protected record TestUser(long id, String uuid, String email, String token) {}

    protected TestUser user(String tag) {
        String uuid = UUID.randomUUID().toString();
        String email = "at-" + tag + "-" + System.nanoTime() + "@example.com";
        jdbc.update("INSERT INTO users (uuid, email, password_hash, name, role, failed_login_count, created_at) VALUES (?,?,?,?, 'USER', 0, NOW(6))",
                uuid, email, encoder.encode(PW), tag.length() > 20 ? tag.substring(0, 20) : tag);
        long id = jdbc.queryForObject("SELECT id FROM users WHERE uuid = ?", Long.class, uuid);
        return new TestUser(id, uuid, email, jwt.createAccessToken(uuid, "USER"));
    }

    protected long document(TestUser owner, String type, String title, String content) {
        jdbc.update("INSERT INTO documents (owner_id, doc_type, title, content, char_count, masked_count, created_at) VALUES (?,?,?,?,?,0,NOW(6))",
                owner.id(), type, title, content, content.length());
        return jdbc.queryForObject("SELECT id FROM documents WHERE owner_id = ? AND title = ?", Long.class, owner.id(), title);
    }

    protected long analysis(TestUser owner, long postingId, long resumeId, boolean finished) {
        jdbc.update("INSERT INTO analyses (owner_id, posting_id, resume_id, title, created_at) VALUES (?,?,?,?,NOW(6))",
                owner.id(), postingId, resumeId, "t-" + System.nanoTime());
        long id = jdbc.queryForObject("SELECT MAX(id) FROM analyses WHERE owner_id = ?", Long.class, owner.id());
        jdbc.update("INSERT INTO analysis_messages (analysis_id, role, content, sources, created_at) VALUES (?, 'USER', '질문', '[]', NOW(6))", id);
        if (finished) jdbc.update("INSERT INTO analysis_messages (analysis_id, role, content, sources, created_at) VALUES (?, 'ASSISTANT', '답변', '[]', NOW(6))", id);
        return id;
    }

    // ── 요청 ───────────────────────────────────────────────
    protected static <B extends AbstractMockHttpServletRequestBuilder<B>> B as(B b, TestUser u) {
        return b.header("Authorization", "Bearer " + u.token());
    }

    protected static MockMultipartHttpServletRequestBuilder upload(String filename, String type, String title, byte[] bytes) {
        return multipart("/api/documents")
                .file(new MockMultipartFile("file", filename, filename.endsWith(".txt") ? "text/plain"
                        : filename.endsWith(".md") ? "text/markdown" : "application/octet-stream", bytes))
                .param("type", type).param("title", title);
    }

    protected JsonNode body(MvcResult r) throws Exception {
        return om.readTree(r.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    protected String json(Object o) throws Exception {
        return om.writeValueAsString(o);
    }

    protected List<RecordedRequest> aiCalls(String pathPrefix) {
        List<RecordedRequest> out = new ArrayList<>();
        for (RecordedRequest r : AI_CALLS) if (r.getPath() != null && r.getPath().startsWith(pathPrefix)) out.add(r);
        return out;
    }

    // ── SSE ────────────────────────────────────────────────
    protected record Sse(String event, String data) {}
    private static final Pattern EVENT = Pattern.compile("event:\\s?(\\w+)\\r?\\ndata:\\s?(.*)");

    /** 스트림이 done/error로 끝날 때까지(최대 15초) 기다렸다가 이벤트 목록으로 */
    protected List<Sse> readStream(MvcResult r) throws Exception {
        long until = System.currentTimeMillis() + 15_000;
        String text = "";
        while (System.currentTimeMillis() < until) {
            text = r.getResponse().getContentAsString(StandardCharsets.UTF_8);
            if (text.contains("event:done") || text.contains("event: done") || text.contains("event:error") || text.contains("event: error")) break;
            Thread.sleep(50);
        }
        Thread.sleep(200);   // done 직후 저장 트랜잭션이 끝날 시간
        List<Sse> out = new ArrayList<>();
        Matcher m = EVENT.matcher(r.getResponse().getContentAsString(StandardCharsets.UTF_8));
        while (m.find()) out.add(new Sse(m.group(1), m.group(2)));
        return out;
    }

    protected static String defaultStream() {
        return sse("token", "\"## 요구 기술\\n\"") + sse("token", "\"| Kubernetes | 없음 |\"")
                + sse("sources", "[{\"type\":\"doc\",\"documentId\":\"1\",\"docType\":\"JOB_POSTING\",\"chunk\":\"우대: Kubernetes\",\"score\":0.8}]")
                + sse("done", "{}");
    }

    protected static String sse(String event, String data) {
        return "event: " + event + "\ndata: " + data + "\n\n";
    }

    private static MockResponse json(int status, String body) {
        return new MockResponse().setResponseCode(status).setHeader("Content-Type", "application/json").setBody(body);
    }
}
