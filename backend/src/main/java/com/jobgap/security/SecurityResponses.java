package com.jobgap.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobgap.common.ApiResponse;
import com.jobgap.common.ErrorCode;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

/** 필터 단계(컨트롤러 밖)에서도 같은 봉투를 쓴다 — Spring 기본 에러 JSON이 새지 않게. */
@Component
public class SecurityResponses {
    private final ObjectMapper mapper;

    public SecurityResponses(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public void write(HttpServletResponse res, ErrorCode code) throws IOException {
        res.setStatus(code.status().value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding(StandardCharsets.UTF_8.name());
        mapper.writeValue(res.getOutputStream(), ApiResponse.error(code));
    }
}
