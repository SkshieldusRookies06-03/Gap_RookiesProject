-- 오너: BE-기능 (T-012) · SPEC §2 시드 · 비밀번호 둘 다 Passw0rd! (BCrypt)
-- 빈 DB에 적용하면 id가 고정된다: kim 공고=1·이력서=2 / lee 공고=3·이력서=4 / lee 분석=1
--   → check-api: OTHER_DOC_ID=3 OTHER_ANALYSIS_ID=1 node seams/check-api.mjs http://localhost
-- 시드 문서는 DB에만 들어간다 — 벡터는 SeedIngestRunner(프로파일 seed)가 채운다.
-- 아래 연락처는 전부 가짜이고, 마스킹된 모양으로 넣는다(업로드 경로를 지나지 않으므로).

INSERT INTO users (uuid, email, password_hash, name, role, created_at) VALUES
 ('11111111-1111-4111-8111-111111111111', 'kim@example.com', '$2a$10$/FP3rcBgj.diYixjfOpltey6ueSOsS/micHEPjDCk/qdzsRh1Sqhy', '김루키', 'USER', NOW(6)),
 ('22222222-2222-4222-8222-222222222222', 'lee@example.com', '$2a$10$/FP3rcBgj.diYixjfOpltey6ueSOsS/micHEPjDCk/qdzsRh1Sqhy', '이루키', 'USER', NOW(6));

INSERT INTO documents (owner_id, doc_type, title, content, char_count, masked_count, created_at) VALUES
 ((SELECT id FROM users WHERE email='kim@example.com'), 'JOB_POSTING', '샘플 공고 - 백엔드 신입',
  '[담당업무]\n- Spring Boot 기반 API 개발\n[자격요건]\n- Java, Spring Boot, JPA\n- MySQL 또는 MariaDB\n- Git 협업 경험\n[우대사항]\n- Docker, Kubernetes\n- AWS 배포 경험\n- Redis, Kafka', 148, 0, NOW(6)),
 ((SELECT id FROM users WHERE email='kim@example.com'), 'RESUME', '샘플 이력서 - 김루키',
  '연락처 010-****-**** · k***@e.com\n[기술]\nJava, Spring Boot, JPA, MariaDB, React, Git\n[프로젝트]\n- 중고거래 플랫폼 백엔드(Spring Boot, JPA, MariaDB)\n- 팀 프로젝트 배포 경험 없음', 146, 2, NOW(6)),
 ((SELECT id FROM users WHERE email='lee@example.com'), 'JOB_POSTING', '샘플 공고 - 데이터 엔지니어',
  '[자격요건]\n- Python, SQL\n- Airflow\n[우대사항]\n- Spark, AWS', 50, 0, NOW(6)),
 ((SELECT id FROM users WHERE email='lee@example.com'), 'RESUME', '샘플 이력서 - 이루키',
  '[기술]\nPython, Pandas, SQL', 24, 0, NOW(6));

INSERT INTO analyses (owner_id, posting_id, resume_id, title, created_at) VALUES
 ((SELECT id FROM users WHERE email='lee@example.com'),
  (SELECT id FROM documents WHERE title='샘플 공고 - 데이터 엔지니어'),
  (SELECT id FROM documents WHERE title='샘플 이력서 - 이루키'),
  '샘플 공고 - 데이터 엔지니어 × 샘플 이력서 - 이루키', NOW(6));

INSERT INTO analysis_messages (analysis_id, role, content, sources, created_at) VALUES
 ((SELECT MAX(id) FROM analyses), 'USER', '갭 분석 리포트', '[]', NOW(6)),
 ((SELECT MAX(id) FROM analyses), 'ASSISTANT', '## 요구 기술\n| 기술 | 보유 |\n|---|---|\n| Airflow | 없음 |', '[]', NOW(6));
