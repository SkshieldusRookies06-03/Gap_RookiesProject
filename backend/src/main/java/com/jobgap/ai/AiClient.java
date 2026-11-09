package com.jobgap.ai;

import com.jobgap.common.BusinessException;
import com.jobgap.common.ErrorCode;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import reactor.core.publisher.Flux;

/**
 * AI 내부 API 호출 한 곳 (SPEC §6) — 오너: BE-기능 · 티켓 T-024 (스파이크 T-006 코드를 여기로).
 * - 단건: RestClient (connect 3s · read 30s) · 헤더 X-Internal-Token · 실패 → BusinessException(AI_UNAVAILABLE)
 * - 스트림: WebClient bodyToFlux(ServerSentEvent) · 전체 상한 Flux.timeout(290s) — responseTimeout은 유휴 시간이라 상한이 못 된다 ·
 *   nginx 310s보다 먼저 끊겨야 event: error를 보낼 수 있다(Spring async 300s는 Flux SSE에 걸리지 않는다 · SPEC §1) · onErrorResume → event: error 봉투 ·
 *   AI 스트림이 done·error 없이 끝나면(EOF) event: error(AI_UNAVAILABLE)로 마감한다(SPEC §4.3 "장애 = error로 끝난다")
 * - ownerUuid는 AuthUser에서만 꺼낸다(프론트 값 금지 · A-3)
 * - 본문에 null을 넣지 않는다 — question "" · history List.of() (AI pydantic이 null을 400으로 거부 · MockWebServer는 못 잡는다)
 */
@Component
public class AiClient {

    public record IngestResult(String documentId, int chunks) {}

    private static final String TOKEN_HEADER = "X-Internal-Token";

    private final RestClient restClient;

    /** Boot 4는 RestClient.Builder 빈이 별도 스타터(restclient)에 있어 정적 builder()를 쓴다 — Jackson 3 변환기는 클래스패스로 자동 등록 */
    public AiClient(AiProperties props) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(props.connectTimeoutMs()));
        factory.setReadTimeout(Duration.ofMillis(props.readTimeoutMs()));
        this.restClient = RestClient.builder()
                .baseUrl(props.baseUrl())
                .requestFactory(factory)
                .defaultHeader(TOKEN_HEADER, props.internalToken())
                .build();
    }

    /** SPEC §6.1 POST /internal/ingest → 201 · 같은 documentId면 AI가 지우고 다시 넣는다(멱등) */
    public IngestResult ingest(String documentId, String ownerUuid, String docType, String title, String text) {
        Map<String, String> body = Map.of("documentId", documentId, "ownerUuid", ownerUuid,
                "docType", docType, "title", title, "text", text);
        try {
            return restClient.post().uri("/internal/ingest")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(IngestResult.class);
        } catch (RestClientException e) {
            throw new BusinessException(ErrorCode.AI_UNAVAILABLE);
        }
    }

    /** SPEC §6.4 DELETE /internal/documents/{id}?ownerUuid=… → 204 (없어도 204 — 멱등) */
    public void deleteDocument(String documentId, String ownerUuid) {
        try {
            restClient.delete().uri("/internal/documents/{id}?ownerUuid={owner}", documentId, ownerUuid)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new BusinessException(ErrorCode.AI_UNAVAILABLE);
        }
    }

    /** mode = REPORT | FOLLOWUP · history = [{role, content}] 최근 historySize개(이번 질문 제외) */
    public Flux<ServerSentEvent<String>> analyze(String ownerUuid, String postingId, String resumeId, String postingTitle,
                                                 String mode, String question, List<Map<String, String>> history) {
        throw new UnsupportedOperationException("T-025 미구현");
    }
}
