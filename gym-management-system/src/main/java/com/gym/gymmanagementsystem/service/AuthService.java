package com.gym.gymmanagementsystem.service;

import com.gym.gymmanagementsystem.model.AdminUser;
import com.gym.gymmanagementsystem.repository.AdminUserRepository;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class AuthService {

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder; // We'll configure this later in SecurityConfig

    @Value("${application.security.jwt.secret-key}")
    private String jwtSecret;

    @Value("${application.security.jwt.expiration-in-ms}")
    private long jwtExpirationMs;

    public AdminUser registerAdmin(String username, String rawPassword) {
        if (adminUserRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists!"); // Or custom exception
        }
        AdminUser newAdmin = new AdminUser();
        newAdmin.setUsername(username);
        newAdmin.setPassword(passwordEncoder.encode(rawPassword)); // Encode password before saving
        return adminUserRepository.save(newAdmin);
    }

    public String login(String username, String rawPassword) {
        AdminUser admin = adminUserRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(rawPassword, admin.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        // Generate JWT Token
        return generateToken(admin);
    }

    private String generateToken(AdminUser admin) {
        Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
        return JWT.create()
                .withSubject(admin.getUsername())
                .withIssuedAt(new Date())
                .withExpiresAt(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .sign(algorithm);
    }

    public boolean validateToken(String token) {
        try {
            Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
            JWT.require(algorithm).build().verify(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String extractUsername(String token) {
        return JWT.require(Algorithm.HMAC256(jwtSecret)).build().verify(token).getSubject();
    }
}