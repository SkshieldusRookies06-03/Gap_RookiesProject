# Spike ③: EC2 + Docker + nginx Hello 외부 접속 및 인스턴스 타입 결정

## 1. 인스턴스 타입 결정 (Instance Type Selection)
* **인스턴스 이름:** `gap-ec2-1` (`i-0bbb3daca4d6e94bf`)
* **선정 타입:** `t3.small` (vCPU 2개, RAM 2GB)
* **선정 사유:** 
  * 수용 기준에 따라 **1GB RAM 이하 인스턴스(t3.micro 등)는 시스템 안정성 및 OOM(Out of Memory) 방지를 위해 제외**하였습니다.
  * 스프링부트 백엔드(Java), AI 서비스(Python/Uvicorn), 프론트엔드 Nginx, 그리고 MariaDB 데이터베이스를 동시에 Docker 컨테이너로 안정적으로 구동하기 위한 권장 최소 자원을 고려하여 `t3.small`을 최종 채택하였습니다.

---

## 2. 보안 그룹 설정 (Security Group Configuration)
서버 인프라 보안 강화를 위해 인바운드 규칙을 다음과 같이 제한 및 구성하였습니다.

| 포트 (Port) | 프로토콜 | 소스 (Source) | 설명 및 목적 |
| :--- | :--- | :--- | :--- |
| **80** | TCP | `0.0.0.0/0` (Anywhere) | 외부 사용자 웹 서비스(Nginx 프론트엔드) HTTP 접속 허용 |
| **443** | TCP | `0.0.0.0/0` (Anywhere) | 외부 사용자 HTTPS 보안 접속 허용 |
| **22** | TCP | `114.205.158.131/32` (My IP) | 관리자 SSH 원격 접속 (무차별 대입 공격 방지를 위해 허용된 공인 IP로만 엄격히 제한) |

---

## 3. Temurin JRE 이미지 환경 기록
* **사용 이미지:** `eclipse-temurin:17-jre` (백엔드 서비스 베이스 이미지)
* **curl 유무 확인:** 
  * 프로덕션 및 경량화를 위해 최적화된 Eclipse Temurin JRE 슬림 이미지 내부에는 기본적으로 `curl` 유틸리티가 포함되어 있지 않음을 확인하였습니다. 컨테이너 내부 진단이나 헬스체크 수행 시 별도의 패키지 설치 또는 Java 기반 헬스체크 메커니즘 활용 방안을 고려하였습니다.

---

## 4. 외부 접속 테스트 결과 (Curl Result)
퍼블릭 IP(`15.165.164.247`) 및 80번 포트를 통해 외부에서 Nginx 웹서버로 접속을 수행한 결과, 정상적인 HTTP 응답을 확인하였습니다.

### 테스트 실행 명령어
```powershell
curl.exe -I [http://15.165.164.247/](http://15.165.164.247/)
```

### 응답 결과 (Response Headers)
```md
HTTP/1.1 200 OK
Server: nginx
Date: Mon, 09 Nov 2026 04:30:46 GMT
Content-Type: text/html
Content-Length: 425
Last-Modified: Mon, 09 Nov 2026 02:26:44 GMT
Connection: keep-alive
ETag: "6af12f64-1a9"
Cache-Control: no-cache
Content-Security-Policy: default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Accept-Ranges: bytes
```



