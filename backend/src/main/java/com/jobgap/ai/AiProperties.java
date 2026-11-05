package com.jobgap.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** application.yml app.ai — SPEC §1 AI 호출 행 (connect 3s · read 30s · stream 300s) */
@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(String baseUrl, String internalToken, int connectTimeoutMs, int readTimeoutMs,
                           int streamTimeoutSeconds, int historySize) {}
