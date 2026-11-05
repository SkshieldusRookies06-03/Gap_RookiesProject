package com.jobgap.common;

import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/**
 * page·size·sort 규칙 한 곳(SPEC §1 페이지 행 · §4.2 정렬 허용 목록).
 * Sort.by(사용자 입력)을 그대로 쓰면 없는 속성이 500이 된다 — 반드시 이걸 거친다.
 */
public final class PageRequests {
    public static final int MAX_SIZE = 50;
    private static final Set<String> DOCUMENT_SORT_KEYS = Set.of("createdAt", "title");

    private PageRequests() {}

    public static PageRequest of(int page, int size, Sort sort) {
        if (page < 0 || size < 1) throw new BusinessException(ErrorCode.VALIDATION_ERROR, "page는 0 이상, size는 1 이상이어야 합니다");
        return PageRequest.of(page, Math.min(size, MAX_SIZE), sort);
    }

    /** "createdAt,desc" 형식 · 허용 목록 밖이면 400 */
    public static Sort documentSort(String raw) {
        String[] parts = (raw == null || raw.isBlank() ? "createdAt,desc" : raw).split(",");
        if (parts.length != 2 || !DOCUMENT_SORT_KEYS.contains(parts[0])
                || !(parts[1].equals("asc") || parts[1].equals("desc"))) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "sort는 createdAt|title,asc|desc 중 하나입니다");
        }
        return Sort.by(Sort.Direction.fromString(parts[1]), parts[0]);
    }
}
