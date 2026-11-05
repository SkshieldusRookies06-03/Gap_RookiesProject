package com.jobgap;

import com.jobgap.acceptance.AcceptanceSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/** CI 1단계(필수) — 컴파일 + 컨텍스트 기동 + Flyway V1·V2 적용. 이게 깨지면 전원이 멈춘다. */
@SpringBootTest
@ActiveProfiles("test")
class JobgapApplicationTests extends AcceptanceSupport.AiStubOnly {
    @Test
    @DisplayName("컨텍스트가 뜨고 Flyway가 적용된다")
    void contextLoads() {}
}
