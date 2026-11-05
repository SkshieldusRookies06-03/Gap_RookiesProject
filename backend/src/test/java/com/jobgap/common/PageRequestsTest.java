package com.jobgap.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/** 페이지·정렬 규칙 단위 — SPEC §1 페이지 행 · §4.2 정렬 허용 목록. 오너: 기술 리드. DB 없이 돈다. */
@DisplayName("[기술 리드 T-005] PageRequests — page/size 범위 · size 50 절단 · 정렬 허용 목록")
class PageRequestsTest {

    @Test
    @DisplayName("page<0 · size<1 은 400 VALIDATION_ERROR")
    void outOfRangeIs400() {
        for (int[] ps : new int[][]{{-1, 20}, {0, 0}, {0, -5}, {Integer.MIN_VALUE, 1}}) {
            assertThatThrownBy(() -> PageRequests.of(ps[0], ps[1], Sort.unsorted()))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> assertThat(((BusinessException) e).code()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        }
    }

    @Test
    @DisplayName("size가 50을 넘으면 50으로 자른다 · 경계 1·50은 그대로")
    void sizeIsCappedAt50() {
        assertThat(PageRequests.of(0, 1, Sort.unsorted()).getPageSize()).isEqualTo(1);
        assertThat(PageRequests.of(0, 50, Sort.unsorted()).getPageSize()).isEqualTo(50);
        assertThat(PageRequests.of(3, 51, Sort.unsorted()).getPageSize()).isEqualTo(50);
        PageRequest huge = PageRequests.of(2, Integer.MAX_VALUE, Sort.unsorted());
        assertThat(huge.getPageSize()).isEqualTo(50);
        assertThat(huge.getPageNumber()).isEqualTo(2);
    }

    @Test
    @DisplayName("정렬 기본값은 createdAt,desc · 허용 4조합은 그대로")
    void allowedSorts() {
        assertThat(PageRequests.documentSort(null)).isEqualTo(Sort.by(Sort.Direction.DESC, "createdAt"));
        assertThat(PageRequests.documentSort("  ")).isEqualTo(Sort.by(Sort.Direction.DESC, "createdAt"));
        assertThat(PageRequests.documentSort("createdAt,asc")).isEqualTo(Sort.by(Sort.Direction.ASC, "createdAt"));
        assertThat(PageRequests.documentSort("title,asc")).isEqualTo(Sort.by(Sort.Direction.ASC, "title"));
        assertThat(PageRequests.documentSort("title,desc")).isEqualTo(Sort.by(Sort.Direction.DESC, "title"));
    }

    @Test
    @DisplayName("허용 목록 밖 정렬은 400 — 없는 속성이 500이 되거나 내부 컬럼으로 정렬되지 않게")
    void disallowedSortsAre400() {
        for (String s : new String[]{"password,asc", "ownerId,desc", "content,asc", "title", "title,up", "title,ASC",
                "createdAt,desc,id", ",desc", "title;drop table users,asc"}) {
            assertThatThrownBy(() -> PageRequests.documentSort(s)).as(s)
                    .isInstanceOf(BusinessException.class)
                    .satisfies(e -> assertThat(((BusinessException) e).code()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        }
    }
}
