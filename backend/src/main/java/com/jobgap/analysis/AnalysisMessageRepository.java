package com.jobgap.analysis;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/** 대화 메시지 조회 — T-025(history)·T-056(목록·페이징)이 쓴다(둘 다 수정 허용에 리포지토리가 없어 여기서 만든다) · 저장은 Analysis.addMessage(cascade) */
public interface AnalysisMessageRepository extends JpaRepository<AnalysisMessage, Long> {

    /** 대화 화면 — 오래된 순 */
    Page<AnalysisMessage> findByAnalysisIdOrderByIdAsc(Long analysisId, Pageable pageable);

    /** T-025 후속 질문 history — USER 저장 전에 최근 6개(최신순, 호출 쪽에서 오래된 순으로 뒤집는다) */
    List<AnalysisMessage> findTop6ByAnalysisIdOrderByIdDesc(Long analysisId);

    long countByAnalysisId(Long analysisId);

    /** 마지막 메시지 */
    Optional<AnalysisMessage> findTopByAnalysisIdOrderByIdDesc(Long analysisId);
}
