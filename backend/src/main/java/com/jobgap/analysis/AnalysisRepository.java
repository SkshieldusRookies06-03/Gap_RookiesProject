package com.jobgap.analysis;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnalysisRepository extends JpaRepository<Analysis, Long> {

    /** 내 분석 목록 — 최신순 */
    Page<Analysis> findByOwnerIdOrderByCreatedAtDesc(Long ownerId, Pageable pageable);

    /** 분석 목록 한 줄 — 제목·개수·마지막 역할만(문서 본문은 읽지 않는다) */
    interface SummaryRow {
        Long getId(); String getTitle(); String getPostingTitle(); String getResumeTitle();
        OffsetDateTime getCreatedAt(); Long getMessageCount(); String getLastRole();
    }

    /** [T-038] 목록 N+1 제거 — 행마다 나가던 마지막 메시지·count·공고·이력서 조회를 한 쿼리로(N과 무관하게 목록 1 + count 1) */
    @Query(value = """
            select a.id as id, a.title as title, p.title as postingTitle, r.title as resumeTitle, a.createdAt as createdAt,
                   (select count(m) from AnalysisMessage m where m.analysis = a) as messageCount,
                   (select m.role from AnalysisMessage m where m.id =
                        (select max(m2.id) from AnalysisMessage m2 where m2.analysis = a)) as lastRole
            from Analysis a join a.posting p join a.resume r
            where a.owner.id = :ownerId
            order by a.createdAt desc""",
            countQuery = "select count(a) from Analysis a where a.owner.id = :ownerId")
    Page<SummaryRow> findSummaries(@Param("ownerId") Long ownerId, Pageable pageable);

    /** 문서 삭제(SPEC §6.4 ②) — 그 문서를 공고 또는 이력서로 쓴 분석 전부 */
    List<Analysis> findByPostingIdOrResumeId(Long postingId, Long resumeId);
}
