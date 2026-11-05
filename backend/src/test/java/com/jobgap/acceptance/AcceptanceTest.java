package com.jobgap.acceptance;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * 판정(인수) 테스트 — 실 컨텍스트 + 실 DB + MockMvc. 계약 오너(기술 리드)가 착수 전에 red로 커밋한다.
 * 구현자는 이 폴더를 고치지 않는다(티켓 "수정 허용"에 없음). 틀려 보이면 기술 리드에게.
 * 스트림 저장이 별도 트랜잭션이라 @Transactional 롤백을 쓰지 않는다 — AcceptanceSupport가 테스트 데이터를 지운다.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public @interface AcceptanceTest {}
