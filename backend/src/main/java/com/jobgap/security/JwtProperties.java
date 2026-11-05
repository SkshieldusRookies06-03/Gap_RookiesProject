package com.jobgap.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** application.yml app.jwt — 값의 정본은 SPEC §1 인증 행 (Access 15분 · Refresh 14일). */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, long accessTokenExpiration, long refreshTokenExpiration) {}
