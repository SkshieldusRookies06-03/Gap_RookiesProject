package com.jobgap.document;

import com.jobgap.ai.AiClient;
import com.jobgap.auth.User;
import com.jobgap.auth.UserRepository;
import com.jobgap.common.BusinessException;
import com.jobgap.common.ErrorCode;
import com.jobgap.common.PageRequests;
import com.jobgap.common.PageResponse;
import com.jobgap.document.DocumentDtos.DocumentDetail;
import com.jobgap.document.DocumentDtos.DocumentSummary;
import com.jobgap.security.AuditLog;
import com.jobgap.security.AuthUser;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * 골격 — 오너: BE-기능. 티켓: T-014(목록·상세·수정·삭제 — 소유 검증 **없이** 먼저) · T-024(업로드·AI 적재) · T-055(삭제 순서) ·
 * T-026(소유 검증 = fix(security): [S-01]). 판정 테스트: acceptance/DocumentAcceptanceTest (수정 금지).
 * 규칙: 검증 순서 = SPEC §4 공통(인증 → 형식 400 → 소유 403 → 존재 404 → 업무 규칙 400) · @Transactional은 여기에만(조회 readOnly) ·
 *       정렬은 PageRequests.documentSort() · 업로드는 PiiMasker.mask() 결과만 저장(연결 1줄은 T-028 기술 리드) ·
 *       업로드 순서 SPEC §1(저장 → 커밋 → ingest → 실패 시 삭제 + AI_UNAVAILABLE) · 삭제 순서 SPEC §6.4
 *       크기는 서비스에서 직접 검사한다: file.getSize() > 200KB → FILE_TOO_LARGE (MockMvc는 multipart 한도를 적용하지 않는다 —
 *       설정값 spring.servlet.multipart.max-file-size는 실서버용 2차 방어선)
 * 만들 것: Document 엔티티(@Table·@Column·LAZY) · DocumentRepository(메서드 이름 쿼리 1 + @Query 1)
 */
@Service
@Transactional(readOnly = true)
public class DocumentService {

    private static final long MAX_FILE_BYTES = 200 * 1024;
    private static final Set<String> ALLOWED_MIME =
            Set.of("text/markdown", "text/x-markdown", "text/plain", "application/octet-stream", "");

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final AiClient aiClient;

    public DocumentService(DocumentRepository documentRepository, UserRepository userRepository, AiClient aiClient) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.aiClient = aiClient;
    }

    public PageResponse<DocumentSummary> list(AuthUser me, DocumentType type, int page, int size, String sort) {
        User owner = userRepository.findByUuid(me.uuid())
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
        PageRequest pageable = PageRequests.of(page, size, PageRequests.documentSort(sort));

        Page<Document> result = (type == null)
                ? documentRepository.findByOwnerId(owner.getId(), pageable)
                : documentRepository.findByOwnerIdAndDocType(owner.getId(), type, pageable);

        return PageResponse.of(result, this::toSummary);
    }

    private DocumentSummary toSummary(Document d) {
        return new DocumentSummary(String.valueOf(d.getId()), d.getDocType(), d.getTitle(),
                d.getCharCount(), d.getCreatedAt());
    }

    /**
     * [S-01] 소유 검증(B-2 IDOR · ADR-06) — 없으면 404, 남의 것이면 403 + 감사 로그(404로 숨기지 않는다).
     * id로 문서를 다루는 메서드(get·updateTitle·delete)는 반드시 이걸 거친다 — 업무 규칙 검증보다 먼저.
     */
    private Document findOwned(AuthUser me, Long id) {
        Document d = documentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.DOCUMENT_NOT_FOUND));
        if (!d.getOwner().getUuid().equals(me.uuid())) {
            AuditLog.forbidden(me.uuid(), "document", id);
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return d;
    }

    public DocumentDetail get(AuthUser me, Long id) {
        Document d = findOwned(me, id);
        return new DocumentDetail(String.valueOf(d.getId()), d.getDocType(), d.getTitle(), d.getCharCount(),
                d.getCreatedAt(), d.getContent(), d.getMaskedCount());
    }

    /**
     * SPEC §1 업로드 순서: 검증 → 마스킹 → DB 저장(트랜잭션 끝) → AI ingest(트랜잭션 밖) → 실패하면 그 행을 지우고 503.
     * NOT_SUPPORTED = 클래스의 readOnly 트랜잭션을 끈다 → save()·delete()가 각자 트랜잭션으로 바로 커밋된다.
     * 같은 제목은 DB UNIQUE(uk_documents_owner_title) 위반 → GlobalExceptionHandler가 409 DUPLICATE_TITLE.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public DocumentSummary upload(AuthUser me, MultipartFile file, DocumentType type, String title) {
        String text = readText(file);
        User owner = userRepository.findByUuid(me.uuid())
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));

        // [T-028 기술 리드] PiiMasker 연결 자리 — 마스킹한 title·text·maskedCount로 바꾼다(S-03)
        Document saved = documentRepository.save(Document.builder()
                .owner(owner).docType(type).title(title).content(text).maskedCount(0)
                .build());

        try {
            aiClient.ingest(String.valueOf(saved.getId()), me.uuid(), type.name(), saved.getTitle(), saved.getContent());
        } catch (RuntimeException e) {
            documentRepository.delete(saved);
            throw (e instanceof BusinessException be) ? be : new BusinessException(ErrorCode.AI_UNAVAILABLE);
        }
        return toSummary(saved);
    }

    /** 검증 순서: 확장자·MIME 415 → 빈 파일 400 → 크기 413 → UTF-8 엄격 디코딩 415 (SPEC §1 업로드 행) */
    private String readText(MultipartFile file) {
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String mime = file.getContentType() == null ? "" : file.getContentType();
        if (!(name.endsWith(".md") || name.endsWith(".txt")) || !ALLOWED_MIME.contains(mime)) {
            throw new BusinessException(ErrorCode.UNSUPPORTED_FILE);
        }
        if (file.isEmpty()) throw new BusinessException(ErrorCode.VALIDATION_ERROR, "빈 파일은 올릴 수 없습니다");
        if (file.getSize() > MAX_FILE_BYTES) throw new BusinessException(ErrorCode.FILE_TOO_LARGE);
        try {
            return StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(file.getBytes()))
                    .toString();
        } catch (IOException e) {   // CharacterCodingException 포함 — UTF-8이 아니다
            throw new BusinessException(ErrorCode.UNSUPPORTED_FILE);
        }
    }

    /**
     * 빈 제목·100자 초과는 컨트롤러 @Valid가 400으로 먼저 막는다 → 소유 403 → 존재 404 → 같은 제목 409.
     * 같은 제목은 UNIQUE(uk_documents_owner_title) 위반 → 409. flush()로 UPDATE를 지금 보내야 예외가 여기서 나와 봉투로 바뀐다.
     */
    @Transactional
    public DocumentSummary updateTitle(AuthUser me, Long id, String title) {
        Document d = findOwned(me, id);
        d.changeTitle(title);
        documentRepository.flush();
        return toSummary(d);
    }

    @Transactional
    public void delete(AuthUser me, Long id) {
        findOwned(me, id);   // [S-01] 소유 검증은 삭제 구현(T-055) 전에도 먼저 막는다
        throw new UnsupportedOperationException("T-014/T-055 미구현");
    }
}
