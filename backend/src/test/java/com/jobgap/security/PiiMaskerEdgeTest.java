package com.jobgap.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * PiiMasker 회귀 — SPEC §6.5 확장분(구분자·+82 · YYMMDD · 생성형 제외 · 서로게이트 절단). 오너: 기술 리드.
 * 판정 테스트 PiiMaskerTest는 그대로 두고, 리뷰에서 찾은 누락·오탐만 여기서 고정한다. DB·Spring 없이 돈다.
 */
@DisplayName("[기술 리드 T-017] PiiMasker 경계 — 누락·오탐 회귀")
class PiiMaskerEdgeTest {

    @Test
    @DisplayName("휴대폰은 하이픈·점·공백·붙여쓰기·+82 모두 가린다 (S-03 누락 회귀)")
    void phoneSeparatorsAndCountryCode() {
        String[] phones = {"010-1234-5678", "010.1234.5678", "010 1234 5678", "01012345678",
                "+82-10-1234-5678", "+82 10 1234 5678", "+821012345678", "011-123-4567"};
        for (String p : phones) {
            var r = PiiMasker.mask("연락처 " + p + " 입니다");
            assertThat(r.count()).as(p).isEqualTo(1);
            assertThat(r.text()).as(p).isEqualTo("연락처 010-****-**** 입니다");
        }
    }

    @Test
    @DisplayName("한글에 붙은 점 구분 번호도 가린다")
    void phoneAdjacentToHangul() {
        var r = PiiMasker.mask("연락처:010.9876.5432입니다");
        assertThat(r.text()).isEqualTo("연락처:010-****-****입니다");
        assertThat(r.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("(지킴) 연도·사번·계좌 같은 일반 숫자는 건드리지 않는다")
    void keepsOrdinaryNumbers() {
        for (String s : new String[]{"사번 2010 1234 5678", "계좌 1234567890123", "2019 0101 1234 프로젝트", "버전 10.1.24"}) {
            var r = PiiMasker.mask(s);
            assertThat(r.count()).as(s).isZero();
            assertThat(r.text()).as(s).isEqualTo(s);
        }
    }

    @Test
    @DisplayName("주민번호는 앞 6자리가 YYMMDD일 때만 — 붙여 쓴 번호도 가린다")
    void residentNumberNeedsDate() {
        assertThat(PiiMasker.mask("9901011234567").text()).isEqualTo("******-*******");
        assertThat(PiiMasker.mask("991301-1234567").count()).as("13월은 날짜가 아니다").isZero();
        assertThat(PiiMasker.mask("990132-1234567").count()).as("32일은 날짜가 아니다").isZero();
    }

    @Test
    @DisplayName("(지킴) '생성형·생산·생활·생각' 앞 날짜는 생년월일이 아니다 · '생' 앞은 가린다")
    void birthBeforeSaengOnlyWhenBirth() {
        for (String s : new String[]{"2023.02.28 생성형 AI 교육", "2022.01.01 생산 라인", "2021.05.05 생활 습관", "2020.03.03 생각 정리"}) {
            assertThat(PiiMasker.mask(s).count()).as(s).isZero();
        }
        assertThat(PiiMasker.mask("1999.01.01 생").text()).isEqualTo("****.**.** 생");
        assertThat(PiiMasker.mask("1999.01.01생 김루키").text()).isEqualTo("****.**.**생 김루키");
    }

    @Test
    @DisplayName("maskAndTrim은 이모지(서로게이트 쌍)를 반으로 자르지 않는다")
    void trimKeepsSurrogatePairs() {
        String title = "a".repeat(99) + "😀";      // 길이 101(char) — 100에서 자르면 상위 서로게이트만 남는다
        var r = PiiMasker.maskAndTrim(title, 100);
        assertThat(r.text()).isEqualTo("a".repeat(99));
        assertThat(Character.isHighSurrogate(r.text().charAt(r.text().length() - 1))).isFalse();

        assertThat(PiiMasker.maskAndTrim("짧은 제목", 100).text()).isEqualTo("짧은 제목");
        assertThat(PiiMasker.maskAndTrim("😀😀", 2).text()).isEqualTo("😀");
    }

    @Test
    @DisplayName("마스킹 뒤 길어진 값도 상한 안으로 자른다 (11자리 → 13자)")
    void trimAfterMasking() {
        var r = PiiMasker.maskAndTrim("x".repeat(89) + "01012345678", 100);   // 100자 → 마스킹 후 102자
        assertThat(r.text()).hasSize(100);
        assertThat(r.count()).isEqualTo(1);
    }
}
