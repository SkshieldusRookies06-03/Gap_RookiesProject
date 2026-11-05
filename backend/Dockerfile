# 오너: DevOps (T-023) · 멀티스테이지 · 실행 이미지 jre · 비root · HEALTHCHECK (R-DP02 · 점검서 I-2·I-4)
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

FROM eclipse-temurin:17-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 1001 --create-home app
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
USER app
ENV TZ=Asia/Seoul JAVA_TOOL_OPTIONS="-Duser.timezone=Asia/Seoul"
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=5 \
  CMD curl -fsS http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
