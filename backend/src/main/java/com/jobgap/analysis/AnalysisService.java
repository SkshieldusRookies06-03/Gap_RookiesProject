package com.jobgap.analysis;

import com.jobgap.analysis.AnalysisDtos.AnalysisSummary;
import com.jobgap.analysis.AnalysisDtos.MessageResponse;
import com.jobgap.analysis.AnalysisDtos.StreamRequest;
import com.jobgap.common.PageResponse;
import com.jobgap.security.AuthUser;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

/**
 * 골격 — 오너: BE-기능. 티켓: T-025(스트림 중계·목록·메시지) · T-026(소유 검증 = fix(security): [S-01]).
 * 판정 테스트: acceptance/AnalysisAcceptanceTest (수정 금지).
 * 중계 규칙(SPEC §4.3): 새 분석이면 event: analysis 먼저 → AI의 token·sources·error는 그대로 → AI의 done은 흘리지 않고
 *   ASSISTANT 저장 후 자기 done{"messageId"} · 끊김·error면 저장하지 않는다 · 질문은 PiiMasker를 거쳐 저장·전송(T-028 연결).
 * 트랜잭션: 질문 저장(짧게) → 스트림(트랜잭션 밖) → 답변 저장(새 짧은 트랜잭션). 스트림 동안 DB 커넥션을 잡지 않는다.
 * 만들 것: Analysis(양방향 messages · cascade ALL · orphanRemoval) · AnalysisMessage · 리포지토리 둘.
 */
@Service
public class AnalysisService {

    public Flux<ServerSentEvent<String>> stream(AuthUser me, StreamRequest req) {
        throw new UnsupportedOperationException("T-025 미구현");
    }

    public PageResponse<AnalysisSummary> list(AuthUser me, int page, int size) {
        throw new UnsupportedOperationException("T-025 미구현");
    }

    public PageResponse<MessageResponse> messages(AuthUser me, Long analysisId, int page, int size) {
        throw new UnsupportedOperationException("T-025 미구현");
    }
}
