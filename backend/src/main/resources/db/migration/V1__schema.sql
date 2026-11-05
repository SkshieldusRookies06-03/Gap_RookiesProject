-- 오너: BE-기능 (T-012) · 정본: SPEC.md §2 · 바꾸면 V3__… 로 추가한다(적용된 파일 수정 금지 — 체크섬)
-- 테이블 4 · 이름 snake_case · FK 전부 RESTRICT(DB cascade 안 씀 — 삭제 순서는 코드, SPEC §6.4)

CREATE TABLE users (
    id                  BIGINT       NOT NULL AUTO_INCREMENT,
    uuid                CHAR(36)     NOT NULL,
    email               VARCHAR(100) NOT NULL,
    password_hash       VARCHAR(100) NOT NULL,
    name                VARCHAR(20)  NOT NULL,
    role                VARCHAR(10)  NOT NULL DEFAULT 'USER',
    failed_login_count  INT          NOT NULL DEFAULT 0,
    locked_until        DATETIME(6)  NULL,
    refresh_token_hash  CHAR(64)     NULL,
    refresh_expires_at  DATETIME(6)  NULL,
    created_at          DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_users_uuid  UNIQUE (uuid),
    CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE documents (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    owner_id      BIGINT       NOT NULL,
    doc_type      VARCHAR(20)  NOT NULL,            -- JOB_POSTING | RESUME
    title         VARCHAR(100) NOT NULL,
    content       MEDIUMTEXT   NOT NULL,            -- 마스킹된 본문만 (ADR-04)
    char_count    INT          NOT NULL,
    masked_count  INT          NOT NULL DEFAULT 0,
    created_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_documents_owner_title UNIQUE (owner_id, title),
    CONSTRAINT fk_documents_owner FOREIGN KEY (owner_id) REFERENCES users (id),
    INDEX idx_documents_owner_created (owner_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE analyses (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    owner_id      BIGINT       NOT NULL,
    posting_id    BIGINT       NOT NULL,
    resume_id     BIGINT       NOT NULL,
    title         VARCHAR(100) NOT NULL,            -- 공고 제목 + " × " + 이력서 제목 (100자 절단)
    created_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_analyses_owner   FOREIGN KEY (owner_id)   REFERENCES users (id),
    CONSTRAINT fk_analyses_posting FOREIGN KEY (posting_id) REFERENCES documents (id),
    CONSTRAINT fk_analyses_resume  FOREIGN KEY (resume_id)  REFERENCES documents (id),
    INDEX idx_analyses_owner_created (owner_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE analysis_messages (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    analysis_id   BIGINT       NOT NULL,
    role          VARCHAR(10)  NOT NULL,            -- USER | ASSISTANT (ASSISTANT는 완주했을 때만 저장)
    content       MEDIUMTEXT   NOT NULL,
    sources       TEXT         NOT NULL,            -- JSON 배열 문자열 · USER는 '[]'
    created_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_messages_analysis FOREIGN KEY (analysis_id) REFERENCES analyses (id),
    INDEX idx_messages_analysis (analysis_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
