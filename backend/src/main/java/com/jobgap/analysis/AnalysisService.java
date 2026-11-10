package com.jobgap.analysis;

import com.jobgap.ai.AiClient;
import com.jobgap.analysis.AnalysisDtos.AnalysisSummary;
import com.jobgap.analysis.AnalysisDtos.MessageResponse;
import com.jobgap.analysis.AnalysisDtos.StreamRequest;
import com.jobgap.auth.User;
import com.jobgap.auth.UserRepository;
import com.jobgap.common.ApiResponse;
import com.jobgap.common.BusinessException;
import com.jobgap.common.ErrorCode;
import com.jobgap.common.PageRequests;
import com.jobgap.common.PageResponse;
import com.jobgap.document.Document;
import com.jobgap.document.DocumentRepository;
import com.jobgap.document.DocumentType;
import com.jobgap.security.AuditLog;
import com.jobgap.security.AuthUser;
import com.jobgap.security.PiiMasker;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import tools.jackson.databind.ObjectMapper;

/**
 * 골격 — 오너: BE-기능. 티켓: T-025(스트림 중계) · T-056(목록·메시지) · T-026(소유 검증 = fix(security): [S-01]).
 * 판정 테스트: acceptance/AnalysisAcceptanceTest (수정 금지).
 * 중계 규칙(SPEC §4.3): 새 분석이면 event: analysis 먼저 → AI의 token·sources·error는 그대로 → AI의 done은 흘리지 않고
 *   ASSISTANT 저장 후 자기 done{"messageId"} · 끊김·error면 저장하지 않는다 · 질문은 PiiMasker를 거쳐 저장·전송(T-028 연결).
 * 트랜잭션: 질문 저장(짧게) → 스트림(트랜잭션 밖) → 답변 저장(새 짧은 트랜잭션). 스트림 동안 DB 커넥션을 잡지 않는다.
 */
@Service
@RequiredArgsConstructor
public class AnalysisService {   // 클래스 단위 @Transactional 없음 — stream이 트랜잭션 밖이어야 한다

    private static final String REPORT_QUESTION = "갭 분석 리포트";
    private static final int TITLE_MAX = 100;

    private final AnalysisRepository analysisRepository;
    private final AnalysisMessageRepository messageRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final AiClient aiClient;
    private final ObjectMapper json;
    private final TransactionTemplate tx;

    /** 스트림 전에 정해 두는 값 — 트랜잭션 안에서 만들고 밖(스트림)에서 쓴다 */
    private record Prepared(long analysisId, boolean isNew, String postingId, String resumeId, String postingTitle,
                            String mode, String question, List<Map<String, String>> history) {}

    /** 동기 검증과 USER 저장을 먼저 끝내고 Flux를 반환한다 — 검증 실패는 Advice가 JSON 봉투로 응답 */
    public Flux<ServerSentEvent<String>> stream(AuthUser me, StreamRequest req) {
        boolean followUp = req.analysisId() != null;
        if (followUp && (req.question() == null || req.question().isBlank())) throw new BusinessException(ErrorCode.VALIDATION_ERROR, "후속 질문을 입력하세요");
        if (!followUp && (req.postingId() == null || req.resumeId() == null)) throw new BusinessException(ErrorCode.VALIDATION_ERROR, "공고와 이력서를 골라 주세요");
        Prepared p = tx.execute(status -> followUp ? prepareFollowUp(me, req) : prepareNew(me, req));
        return relay(me, p);
    }

    private Prepared prepareNew(AuthUser me, StreamRequest req) {
        User owner = userRepository.findByUuid(me.uuid()).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        // [S-01] 둘 다 조회한 뒤 소유 403 → 존재 404 → (아래) 종류 400 — 남의 문서가 404·400에 묻히지 않게(ADR-06)
        Optional<Document> p = documentRepository.findById(Long.valueOf(req.postingId()));
        Optional<Document> r = documentRepository.findById(Long.valueOf(req.resumeId()));
        requireOwned(me, p);
        requireOwned(me, r);
        Document posting = p.orElseThrow(() -> new BusinessException(ErrorCode.DOCUMENT_NOT_FOUND));
        Document resume = r.orElseThrow(() -> new BusinessException(ErrorCode.DOCUMENT_NOT_FOUND));
        if (posting.getDocType() != DocumentType.JOB_POSTING || resume.getDocType() != DocumentType.RESUME) throw new BusinessException(ErrorCode.DOCUMENT_TYPE_MISMATCH);
        String title = posting.getTitle() + " × " + resume.getTitle();
        Analysis a = Analysis.create(owner, posting, resume, title.length() > TITLE_MAX ? title.substring(0, TITLE_MAX) : title);
        a.addMessage("USER", REPORT_QUESTION, "[]");
        analysisRepository.save(a);
        return new Prepared(a.getId(), true, req.postingId(), req.resumeId(), posting.getTitle(), "REPORT", "", List.of());
    }

    private Prepared prepareFollowUp(AuthUser me, StreamRequest req) {
        Analysis a = ownedAnalysis(me, Long.valueOf(req.analysisId()));   // [S-01]
        // history는 USER 저장 **전에** 읽는다(이번 질문 제외) · 최신순으로 오니 오래된 순으로 뒤집는다
        List<Map<String, String>> history = new ArrayList<>();
        for (AnalysisMessage m : messageRepository.findTop6ByAnalysisIdOrderByIdDesc(a.getId())) {
            history.add(Map.of("role", m.getRole(), "content", m.getContent()));
        }
        Collections.reverse(history);
        // [S-03] 질문은 마스킹한 값으로 USER 저장·AI 전송 둘 다 한다(원문은 어디에도 남기지 않는다)
        String question = PiiMasker.maskAndTrim(req.question(), 1000).text();
        messageRepository.save(a.addMessage("USER", question, "[]"));
        return new Prepared(a.getId(), false, String.valueOf(a.getPosting().getId()), String.valueOf(a.getResume().getId()),
                a.getPosting().getTitle(), "FOLLOWUP", question, history);
    }

    /**
     * [S-01] 소유 검증(B-2 IDOR · ADR-06) — 없으면 404, 남의 것이면 403 + 감사 로그(404로 숨기지 않는다) · 본인 소유만(ADMIN 예외 없음).
     * 트랜잭션 안에서만 부른다(owner LAZY).
     */
    private void requireOwned(AuthUser me, Optional<Document> doc) {
        doc.filter(d -> !d.getOwner().getUuid().equals(me.uuid())).ifPresent(d -> {
            AuditLog.forbidden(me.uuid(), "document", d.getId());
            throw new BusinessException(ErrorCode.FORBIDDEN);
        });
    }

    private Analysis ownedAnalysis(AuthUser me, Long id) {
        Analysis a = analysisRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.ANALYSIS_NOT_FOUND));
        if (!a.getOwner().getUuid().equals(me.uuid())) {
            AuditLog.forbidden(me.uuid(), "analysis", id);
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return a;
    }

    /** AI의 token·sources·error는 그대로 · done은 가로채 저장 후 자기 done · 연결 실패·타임아웃·EOF는 event: error */
    private Flux<ServerSentEvent<String>> relay(AuthUser me, Prepared p) {
        StringBuilder answer = new StringBuilder();
        AtomicReference<String> sources = new AtomicReference<>("[]");
        AtomicBoolean finished = new AtomicBoolean(false);   // done 또는 error를 보냈는가

        Flux<ServerSentEvent<String>> relay = aiClient
                .analyze(me.uuid(), p.postingId(), p.resumeId(), p.postingTitle(), p.mode(), p.question(), p.history())
                .concatMap(ev -> switch (String.valueOf(ev.event())) {
                    // token data는 JSON 문자열 — 디코드해 이어 붙이고 원문은 그대로 흘린다
                    case "token" -> { answer.append(json.readValue(ev.data(), String.class)); yield Mono.just(ev); }
                    case "sources" -> { sources.set(ev.data()); yield Mono.just(ev); }
                    case "done" -> Mono.fromCallable(() -> saveAssistant(p.analysisId(), answer.toString(), sources.get()))
                            .subscribeOn(Schedulers.boundedElastic())
                            .doOnNext(id -> finished.set(true))
                            .map(id -> event("done", "{\"messageId\":\"" + id + "\"}"));
                    case "error" -> { finished.set(true); yield Mono.just(ev); }   // 그대로 흘림 — 저장 안 함
                    default -> Mono.just(ev);
                })
                .onErrorResume(e -> { finished.set(true); return Mono.just(errorEvent()); })   // 연결 실패·타임아웃·저장 실패
                .concatWith(Mono.defer(() -> finished.get() ? Mono.empty() : Mono.just(errorEvent())));   // done·error 없는 EOF

        return p.isNew() ? Flux.concat(Mono.just(event("analysis", "{\"analysisId\":\"" + p.analysisId() + "\"}")), relay) : relay;
    }

    /** 완주했을 때만 — 새 짧은 트랜잭션 */
    private long saveAssistant(long analysisId, String content, String sourcesJson) {
        return tx.execute(status -> {
            Analysis a = analysisRepository.findById(analysisId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.ANALYSIS_NOT_FOUND));
            return messageRepository.save(a.addMessage("ASSISTANT", content, sourcesJson)).getId();
        });
    }

    private static ServerSentEvent<String> event(String name, String data) {
        return ServerSentEvent.<String>builder().event(name).data(data).build();
    }

    private ServerSentEvent<String> errorEvent() {
        return event("error", json.writeValueAsString(ApiResponse.error(ErrorCode.AI_UNAVAILABLE)));
    }

    /** 내 분석 목록 — 최신순 고정 · lastStatus는 저장하지 않고 마지막 메시지 role로 파생(SPEC §2) */
    @Transactional(readOnly = true)
    public PageResponse<AnalysisSummary> list(AuthUser me, int page, int size) {
        var pageable = PageRequests.of(page, size, Sort.unsorted());   // 형식 400 먼저(SPEC §4 공통 순서) · size>50 → 50
        User owner = userRepository.findByUuid(me.uuid()).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        return PageResponse.of(analysisRepository.findByOwnerIdOrderByCreatedAtDesc(owner.getId(), pageable), this::toSummary);
    }

    /** DTO 변환은 트랜잭션 안에서(posting·resume LAZY) · 분석당 쿼리 2개(N+1 감수 — size 50 상한) */
    private AnalysisSummary toSummary(Analysis a) {
        String lastStatus = messageRepository.findTopByAnalysisIdOrderByIdDesc(a.getId())
                .filter(m -> "ASSISTANT".equals(m.getRole())).isPresent() ? "DONE" : "INCOMPLETE";
        return new AnalysisSummary(String.valueOf(a.getId()), a.getTitle(), a.getPosting().getTitle(), a.getResume().getTitle(),
                (int) messageRepository.countByAnalysisId(a.getId()), lastStatus, a.getCreatedAt());
    }

    /** 대화 내역 — 오래된 순 · sources는 DB 문자열 그대로(@JsonRawValue로 배열) */
    @Transactional(readOnly = true)
    public PageResponse<MessageResponse> messages(AuthUser me, Long analysisId, int page, int size) {
        var pageable = PageRequests.of(page, size, Sort.unsorted());
        ownedAnalysis(me, analysisId);   // [S-01] 남의 분석 403 · 없으면 404
        return PageResponse.of(messageRepository.findByAnalysisIdOrderByIdAsc(analysisId, pageable),
                m -> new MessageResponse(String.valueOf(m.getId()), m.getRole(), m.getContent(), m.getSources(), m.getCreatedAt()));
    }
}
