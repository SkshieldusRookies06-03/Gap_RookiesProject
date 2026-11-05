package com.jobgap.common;

import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

/** 목록 응답 data — `content[]` + `page{…}` (SPEC §1 응답 봉투 행 · 0-base). */
public record PageResponse<T>(List<T> content, PageInfo page) {

    public record PageInfo(int number, int size, long totalElements, int totalPages,
                           boolean first, boolean last, int numberOfElements) {}

    public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(page.getContent().stream().map(mapper).toList(),
                new PageInfo(page.getNumber(), page.getSize(), page.getTotalElements(),
                        Math.max(1, page.getTotalPages()), page.isFirst(), page.isLast(), page.getNumberOfElements()));
    }
}
