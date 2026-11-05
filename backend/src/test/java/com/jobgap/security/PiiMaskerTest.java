package com.jobgap.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("[기술 리드 T-017] PiiMasker — SPEC §6.5 표")
class PiiMaskerTest {

    @Test
    @DisplayName("휴대폰·이메일·주민번호·생년월일을 가리고 개수를 센다")
    void masksFourKinds() {
        var r = PiiMasker.mask("연락처 010-1234-5678, 01098765432 / kim.rookie@gmail.com / 990101-1234567 / 1999.01.01 생");
        assertThat(r.text()).doesNotContain("1234-5678").doesNotContain("98765432").doesNotContain("kim.rookie")
                .doesNotContain("990101-1234567").doesNotContain("1999.01.01");
        assertThat(r.text()).contains("010-****-****").contains("k***@g.com").contains("******-*******").contains("****.**.**");
        assertThat(r.count()).isEqualTo(5);
    }

    @Test
    @DisplayName("(지킴) 기술 스택·연도만 있는 경력은 건드리지 않는다")
    void keepsNormalText() {
        var r = PiiMasker.mask("Java 17, Spring Boot 3.3, 2021.03 ~ 2023.02 재직, 팀원 5명");
        assertThat(r.count()).isZero();
        assertThat(r.text()).isEqualTo("Java 17, Spring Boot 3.3, 2021.03 ~ 2023.02 재직, 팀원 5명");
    }

    @Test
    @DisplayName("(지킴) 한글에 붙은 번호도 가린다 — JDK 17의 \\b 함정")
    void hangulAdjacent() {
        var r = PiiMasker.mask("전화010-1234-5678 주민990101-1234567");
        assertThat(r.text()).doesNotContain("1234-5678").doesNotContain("990101-1234567");
        assertThat(r.count()).isEqualTo(2);
    }

    @Test
    @DisplayName("(지킴) 생년월일은 '생년월일·출생·생일' 뒤 또는 '생' 앞의 날짜만 — 경력 기간은 그대로")
    void birthOnlyInContext() {
        assertThat(PiiMasker.mask("생년월일: 1999년 1월 1일").text()).isEqualTo("생년월일: ****.**.**");
        assertThat(PiiMasker.mask("재직 2021.03.15 ~ 2023.02.28").count()).isZero();
    }

    @Test
    @DisplayName("(지킴) 200KB 텍스트도 1초 안에 — 이메일 패턴 역추적 폭주 방지")
    void fastOnLargeInput() {
        String big = "a.b.c-d".repeat(30_000);
        long t = System.currentTimeMillis();
        PiiMasker.mask(big);
        assertThat(System.currentTimeMillis() - t).isLessThan(1000);
    }

    @Test
    @DisplayName("로그용 이메일 마스킹 a***@x.com")
    void maskEmail() {
        assertThat(PiiMasker.maskEmail("kim@example.com")).isEqualTo("k***@e.com");
    }
}
