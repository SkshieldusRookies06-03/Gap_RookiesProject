package com.jobgap.analysis;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnalysisRepository extends JpaRepository<Analysis, Long> {

    /** 문서 삭제(SPEC §6.4 ②) — 그 문서를 공고 또는 이력서로 쓴 분석 전부 */
    List<Analysis> findByPostingIdOrResumeId(Long postingId, Long resumeId);
}
