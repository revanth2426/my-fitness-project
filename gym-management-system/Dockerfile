# Stage 1: Build the application
FROM eclipse-temurin:17-jdk-alpine as builder

# Set the working directory
WORKDIR /app

# Copy Maven pom.xml and source code
COPY pom.xml .
COPY src ./src

# NEW: Install Maven
# This command uses the Alpine Linux package manager (apk) to install Maven.
RUN apk add --no-cache maven

# Build the JAR file
RUN mvn clean package -Dmaven.test.skip=true

# Stage 2: Create the final image
FROM eclipse-temurin:17-jre-alpine

# Set the working directory
WORKDIR /app

# Copy the JAR file from the builder stage
COPY --from=builder /app/target/gym-management-system-0.0.1-SNAPSHOT.jar app.jar

# Expose the port your Spring Boot app runs on
EXPOSE 8088

# Command to run the application
ENTRYPOINT ["java","-jar","app.jar"]