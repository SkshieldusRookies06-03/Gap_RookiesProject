# Backend 개발 명세서

> 정본 기준 · 기준 커밋: (확정 시 기입) · v0.1 — scaffold-docs-p3 생성 2026-11-05 · 문서 오너: BE
> 절마다 FILL 주석이 가리키는 정본에서 발췌하고, 채운 절의 주석은 지운다. 쓸 게 없는 절은 "해당 없음 — 이유 한 줄".

## 1. 기술 스택

<!-- FILL ← 정본: `pom.xml` · 방법: 라벨마다 실제 버전(빌드 = Maven wrapper) · 오너: BE -->

- **Framework**: 
- **언어**: 
- **데이터베이스**: 
- **빌드**: 

## 2. 프로젝트 구조

<!-- FILL ← 정본: `find backend/src/main -type d` · 방법: 트리 + 패키지 한 줄 역할 · 오너: BE -->

## 3. 주요 설정

<!-- FILL ← 정본: `application.yml` · 방법: 발췌 — 비밀은 전부 `${…}`(기본값 없이) · ddl-auto validate · Flyway · actuator exposure · include-stacktrace never · CORS Origin 환경변수 · async request-timeout · multipart 한도 · 오너: BE -->

## 4. 주요 클래스

### 4.1 Entity

<!-- FILL ← 정본: `entity/*.java` · P3-0.1 엔티티 규약 · 방법: 엔티티 목록 한 줄씩 · 오너: BE -->

#### 4.1.1 엔티티 규약·연관관계

<!-- FILL ← 정본: `entity/*.java` · P3-0.1 엔티티 규약 · 방법: 표(엔티티 · @Table name · 관계 · 방향과 이유 · Fetch · Cascade) · 오너: BE -->

### 4.2 Controller

<!-- FILL ← 정본: `controller/*.java` · 방법: 컨트롤러 · 경로 접두어 · `@PreAuthorize` 식 · 오너: BE -->

### 4.3 Service

<!-- FILL ← 정본: `service/*.java` · 방법: 서비스 · 핵심 메서드 한 줄 목적(소유자 검증 위치 표시) · 오너: BE -->

### 4.4 Repository

<!-- FILL ← 정본: `repository/*.java` · 서비스 `@Transactional` · 방법: 메서드 이름 쿼리 1 + `@Query` 1 발췌 · 오너: BE -->

### 4.5 트랜잭션 경계

<!-- FILL ← 정본: `repository/*.java` · 서비스 `@Transactional` · 방법: 표(메서드 · 쓰기/readOnly · 이유 — 스트림을 트랜잭션 밖에 둔 이유 포함) · 오너: BE -->

## 5. 보안 구현

### 5.1 인증/인가

<!-- FILL ← 정본: SecurityConfig · Jwt 클래스 · RefreshToken 서비스 · 방법: 필터 체인 순서(`/actuator/health` permitAll → `/actuator/**` ADMIN · ASYNC/ERROR dispatch permitAll) · 토큰 발급/검증/회전 · 역할 검사 + "본인 또는 ADMIN" 발췌 · 오너: 보안 -->

### 5.2 공격 방어

<!-- FILL ← 정본: 각 방어 클래스 · 방법: 위협 열 유지 · 방어 방식 · 구현 위치 = 클래스·메서드 · CSRF 행 = P3-0.1 사유 문장 그대로 · 오너: 보안 -->

| 위협 | 방어 방식 | 구현 위치 |
|------|-----------|-----------|
| SQL Injection |  | |
| Brute Force |  | |
| CSRF |  | |
| XSS |  | |
| 입력값 검증 |  | |

### 5.3 설정·로그

<!-- FILL ← 정본: SecurityConfig · 감사 리스너 · Advice · 방법: CORS · Actuator ADMIN · 감사 로그 4종 + 마스킹 예시 로그 한 줄 · 500 일반 메시지 · 오너: 보안 -->

## 6. AI 모듈 연동

<!-- FILL ← 정본: AI 클라이언트 설정 · 방법: RestClient·WebClient 빈 발췌(타임아웃 숫자) · Fallback(503 AI_UNAVAILABLE · event: error) · 내부 토큰 주입 위치 · owner 전달 · 오너: BE -->

## 7. 파일 처리

<!-- FILL ← 정본: 업로드 서비스 · 방법: 형식 화이트리스트·크기·파일명 uuid 재생성(B-10) · 저장 볼륨 · ingest 전달 · 오너: BE -->

## 8. 예외 처리

<!-- FILL ← 정본: `@RestControllerAdvice` · `ErrorCode` · 방법: 예외 → 상태·코드 표(4번 §6과 같은 코드) · 프로토콜 결함 행렬 처리 · 500은 일반 메시지 · 오너: BE -->

## 9. 빌드 및 배포

<!-- FILL ← 정본: Dockerfile · SBOM 출력 · 방법: `./mvnw` 빌드 명령 · Dockerfile 요약 · SBOM 명령과 CVE 건수(`security/evidence/bom.json` · 상세는 9번) · 오너: BE -->
