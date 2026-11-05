package com.jobgap.document;

import com.jobgap.common.ApiResponse;
import com.jobgap.common.PageResponse;
import com.jobgap.document.DocumentDtos.DocumentDetail;
import com.jobgap.document.DocumentDtos.DocumentSummary;
import com.jobgap.document.DocumentDtos.TitleUpdateRequest;
import com.jobgap.security.AuthUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** SPEC §4.2 — 시그니처는 계약(골격). 구현은 DocumentService (T-014 · T-024 · BE-기능). */
@RestController
@RequestMapping("/api/documents")
@Validated
@PreAuthorize("hasAnyAuthority('ROLE_USER','ROLE_ADMIN')")
public class DocumentController {
    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping
    public ApiResponse<PageResponse<DocumentSummary>> list(@AuthenticationPrincipal AuthUser me,
                                                           @RequestParam(required = false) DocumentType type,
                                                           @RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "20") int size,
                                                           @RequestParam(defaultValue = "createdAt,desc") String sort) {
        return ApiResponse.ok(documentService.list(me, type, page, size, sort), "문서 목록을 조회했습니다");
    }

    @GetMapping("/{id}")
    public ApiResponse<DocumentDetail> get(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return ApiResponse.ok(documentService.get(me, id), "문서를 조회했습니다");
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DocumentSummary> upload(@AuthenticationPrincipal AuthUser me,
                                               @RequestPart("file") MultipartFile file,
                                               @RequestParam DocumentType type,
                                               @RequestParam @NotBlank @Size(max = 100) String title) {
        return ApiResponse.ok(documentService.upload(me, file, type, title), "업로드되었습니다");
    }

    @PutMapping("/{id}")
    public ApiResponse<DocumentSummary> updateTitle(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                                                    @Valid @RequestBody TitleUpdateRequest req) {
        return ApiResponse.ok(documentService.updateTitle(me, id, req.title()), "제목이 수정되었습니다");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        documentService.delete(me, id);
        return ApiResponse.ok(null, "삭제되었습니다");
    }
}
