package com.jobgap.ai;

import java.util.List;
import java.util.Map;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

/**
 * AI 내부 API 호출 한 곳 (SPEC §6) — 오너: BE-기능 · 티켓 T-024 (스파이크 T-006 코드를 여기로).
 * - 단건: RestClient (connect 3s · read 30s) · 헤더 X-Internal-Token · 실패 → BusinessException(AI_UNAVAILABLE)
 * - 스트림: WebClient bodyToFlux(ServerSentEvent) · responseTimeout 300s · onErrorResume → event: error 봉투
 * - ownerUuid는 AuthUser에서만 꺼낸다(프론트 값 금지 · A-3)
 */
@Component
public class AiClient {

    public record IngestResult(String documentId, int chunks) {}

    public IngestResult ingest(String documentId, String ownerUuid, String docType, String title, String text) {
        throw new UnsupportedOperationException("T-024 미구현");
    }

    public void deleteDocument(String documentId, String ownerUuid) {
        throw new UnsupportedOperationException("T-024 미구현");
    }

    /** mode = REPORT | FOLLOWUP · history = [{role, content}] 최근 historySize개(이번 질문 제외) */
    public Flux<ServerSentEvent<String>> analyze(String ownerUuid, String postingId, String resumeId, String postingTitle,
                                                 String mode, String question, List<Map<String, String>> history) {
        throw new UnsupportedOperationException("T-025 미구현");
    }
}
