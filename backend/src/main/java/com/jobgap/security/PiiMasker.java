package com.jobgap.security;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 개인정보 마스킹 — SPEC §6.5 표가 정본 (ADR-04 · 점검서 A-3 · S-03). 업로드 본문·문서 제목·질문에 적용한 뒤
 * 저장하고 AI로 보낸다. 오너: 기술 리드. 연결(호출 1줄)은 T-028 `fix(security): [S-03]`.
 */
public final class PiiMasker {
    public record Result(String text, int count) {}

    // \b 대신 숫자 경계 lookaround — JDK 17의 \b는 한글을 단어 문자로 봐서 "전화010-…"을 놓친다(JDK-8264160)
    private static final Pattern RRN = Pattern.compile("(?<!\\d)\\d{6}-?[1-4]\\d{6}(?!\\d)");
    private static final Pattern PHONE = Pattern.compile("(?<!\\d)01[016789]-?\\d{3,4}-?\\d{4}(?!\\d)");
    // 소유 수량자 ++ — '@' 없는 긴 텍스트에서 이차 시간으로 느려지지 않게(200KB에서 100초+ → 수십 ms)
    private static final Pattern EMAIL = Pattern.compile("(?<![\\w.+-])[\\w.+-]++@[\\w-]+(?:\\.[\\w-]+)+");
    // 생년월일은 "생년월일/출생/생일" 뒤 또는 "생" 앞의 날짜만 — 경력 기간(2021.03.15 ~ 2023.02.28)은 건드리지 않는다
    private static final String DATE = "(?:19|20)\\d{2}\\s?[.\\-/년]\\s?\\d{1,2}\\s?[.\\-/월]\\s?\\d{1,2}(?:\\s?일)?";
    private static final Pattern BIRTH_AFTER = Pattern.compile("(생년월일|출생일?|생일)(\\s*[:：]?\\s*)" + DATE);
    private static final Pattern BIRTH_BEFORE = Pattern.compile(DATE + "(?=\\s?생(?![각산활]))");

    private PiiMasker() {}

    public static Result mask(String input) {
        if (input == null || input.isEmpty()) return new Result(input == null ? "" : input, 0);
        int[] count = {0};
        String s = replace(RRN, input, m -> "******-*******", count);       // 주민번호를 휴대폰보다 먼저(자릿수 겹침)
        s = replace(PHONE, s, m -> "010-****-****", count);
        s = replace(EMAIL, s, m -> maskEmail(m.group()), count);
        s = replace(BIRTH_AFTER, s, m -> m.group(1) + m.group(2) + "****.**.**", count);
        s = replace(BIRTH_BEFORE, s, m -> "****.**.**", count);
        return new Result(s, count[0]);
    }

    /** a***@x.com 형식 — 로그·화면 공용 */
    public static String maskEmail(String email) {
        if (email == null) return "";
        int at = email.indexOf('@');
        if (at < 1) return "***";
        String domain = email.substring(at + 1);
        int dot = domain.lastIndexOf('.');
        String tld = dot >= 0 ? domain.substring(dot) : "";
        return email.charAt(0) + "***@" + (domain.isEmpty() ? "" : domain.charAt(0)) + tld;
    }

    private interface Rep { String apply(Matcher m); }

    private static String replace(Pattern p, String s, Rep rep, int[] count) {
        Matcher m = p.matcher(s);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            count[0]++;
            m.appendReplacement(sb, Matcher.quoteReplacement(rep.apply(m)));
        }
        m.appendTail(sb);
        return sb.toString();
    }
}
