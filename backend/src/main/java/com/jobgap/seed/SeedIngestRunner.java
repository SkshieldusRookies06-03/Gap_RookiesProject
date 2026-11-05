package com.jobgap.seed;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 프로파일 seed로 기동하면 DB의 모든 문서를 AI에 delete → ingest (멱등) — SPEC §2 시드.
 * 오너: BE-인증 · 티켓 T-027 (BF의 AiClient를 쓴다). 데모 직전: SPRING_PROFILES_ACTIVE=prod,seed 로 1회 기동.
 */
@Component
@Profile("seed")
public class SeedIngestRunner implements ApplicationRunner {
    @Override
    public void run(ApplicationArguments args) {
        // TODO T-027: documentRepository.findAll() → aiClient.deleteDocument → aiClient.ingest (실패는 로그만, 기동은 계속)
    }
}
