package com.jobgap.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 서비스 계층에서 쓰는 감사 로그 한 곳 (B-9). 로그에 토큰·비밀번호·질문 본문·문서 본문을 남기지 않는다.
 * 예: 소유 검증 실패 → AuditLog.forbidden(me.uuid(), "document", id); throw new BusinessException(ErrorCode.FORBIDDEN);
 */
public final class AuditLog {
    private static final Logger audit = LoggerFactory.getLogger("AUDIT");

    private AuditLog() {}

    public static void forbidden(String actorUuid, String resource, Object id) {
        audit.warn("403 owner-mismatch actor={} resource={} id={}", actorUuid, resource, id);
    }

    /** 메서드 단계(@PreAuthorize) 403 — 필터 단계는 RestAccessDeniedHandler가 같은 모양으로 남긴다 */
    public static void denied(String ip, String method, String uri) {
        audit.warn("403 ip={} uri={} {}", ip, method, uri);
    }

    public static void locked(String email) {
        audit.warn("LOCK account={}", PiiMasker.maskEmail(email));
    }
}
