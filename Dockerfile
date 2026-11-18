FROM eclipse-temurin:27-jdk-jammy
WORKDIR /app
COPY . .
RUN ./mvnw clean package -DskipTests || mvn clean package -DskipTests
EXPOSE 8080
CMD ["mvn", "exec:java", "-Dexec.mainClass=\"software.ulpgc.chess.Main\""]