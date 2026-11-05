package com.jobgap.analysis;

import com.jobgap.analysis.AnalysisDtos.AnalysisSummary;
import com.jobgap.analysis.AnalysisDtos.MessageResponse;
import com.jobgap.analysis.AnalysisDtos.StreamRequest;
import com.jobgap.common.ApiResponse;
import com.jobgap.common.PageResponse;
import com.jobgap.security.AuthUser;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

/**
 * SPEC §4.3 — 시그니처는 계약(골격). 구현은 AnalysisService (T-025 · BE-기능).
 * 스트림: 검증(403/404/400)은 Flux를 만들기 **전에** 동기로 끝낸다 → 실패하면 Advice가 JSON 봉투로 응답한다.
 */
@RestController
@RequestMapping("/api/analyses")
@PreAuthorize("hasAnyAuthority('ROLE_USER','ROLE_ADMIN')")
public class AnalysisController {
    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> stream(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody StreamRequest req) {
        return analysisService.stream(me, req);
    }

    @GetMapping
    public ApiResponse<PageResponse<AnalysisSummary>> list(@AuthenticationPrincipal AuthUser me,
                                                           @RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(analysisService.list(me, page, size), "분석 목록을 조회했습니다");
    }

    @GetMapping("/{id}/messages")
    public ApiResponse<PageResponse<MessageResponse>> messages(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                                                               @RequestParam(defaultValue = "0") int page,
                                                               @RequestParam(defaultValue = "50") int size) {
        return ApiResponse.ok(analysisService.messages(me, id, page, size), "메시지를 조회했습니다");
    }
}
