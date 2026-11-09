package com.jobgap.seed;

import com.jobgap.ai.AiClient;
import com.jobgap.document.Document;
import com.jobgap.document.DocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** seed 프로파일로 기동할 때 DB 시드 문서를 AI에 delete → ingest 한다. (T-027) */
@Component
@Profile("seed")
public class SeedIngestRunner implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(SeedIngestRunner.class);

    private final DocumentRepository documentRepository;
    private final AiClient aiClient;

    public SeedIngestRunner(DocumentRepository documentRepository, AiClient aiClient) {
        this.documentRepository = documentRepository;
        this.aiClient = aiClient;
    }

    @Override
    @Transactional(readOnly = true)
    public void run(ApplicationArguments args) {
        for (Document doc : documentRepository.findAll()) {
            String documentId = doc.getId().toString();
            try {
                String ownerUuid = doc.getOwner().getUuid();
                aiClient.deleteDocument(documentId, ownerUuid);
                aiClient.ingest(documentId, ownerUuid, doc.getDocType().name(),
                        doc.getTitle(), doc.getContent());
                log.info("Seed ingest 완료: documentId={}", documentId);
            } catch (RuntimeException ex) {
                // AI 서버가 일시 중단돼도 Spring Boot 기동은 계속한다.
                log.warn("Seed ingest 실패: documentId={}, error={}",
                        documentId, ex.getClass().getSimpleName());
            }
        }
    }
}
