package com.jobgap.document;

import com.jobgap.common.PageResponse;
import com.jobgap.document.DocumentDtos.DocumentDetail;
import com.jobgap.document.DocumentDtos.DocumentSummary;
import com.jobgap.security.AuthUser;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * 골격 — 오너: BE-기능. 티켓: T-014(목록·상세·수정·삭제 — 소유 검증 **없이** 먼저) · T-024(업로드·AI 적재·삭제 순서) ·
 * T-026(소유 검증 = fix(security): [S-01]). 판정 테스트: acceptance/DocumentAcceptanceTest (수정 금지).
 * 규칙: 검증 순서 = SPEC §4 공통(인증 → 형식 400 → 소유 403 → 존재 404 → 업무 규칙 400) · @Transactional은 여기에만(조회 readOnly) ·
 *       정렬은 PageRequests.documentSort() · 업로드는 PiiMasker.mask() 결과만 저장(연결 1줄은 T-028 기술 리드) ·
 *       업로드 순서 SPEC §1(저장 → 커밋 → ingest → 실패 시 삭제 + AI_UNAVAILABLE) · 삭제 순서 SPEC §6.4
 *       크기는 서비스에서 직접 검사한다: file.getSize() > 200KB → FILE_TOO_LARGE (MockMvc는 multipart 한도를 적용하지 않는다 —
 *       설정값 spring.servlet.multipart.max-file-size는 실서버용 2차 방어선)
 * 만들 것: Document 엔티티(@Table·@Column·LAZY) · DocumentRepository(메서드 이름 쿼리 1 + @Query 1)
 */
@Service
public class DocumentService {

    public PageResponse<DocumentSummary> list(AuthUser me, DocumentType type, int page, int size, String sort) {
        throw new UnsupportedOperationException("T-014 미구현");
    }

    public DocumentDetail get(AuthUser me, Long id) {
        throw new UnsupportedOperationException("T-014 미구현");
    }

    public DocumentSummary upload(AuthUser me, MultipartFile file, DocumentType type, String title) {
        throw new UnsupportedOperationException("T-024 미구현");
    }

    public DocumentSummary updateTitle(AuthUser me, Long id, String title) {
        throw new UnsupportedOperationException("T-014 미구현");
    }

    public void delete(AuthUser me, Long id) {
        throw new UnsupportedOperationException("T-014/T-024 미구현");
    }
}
