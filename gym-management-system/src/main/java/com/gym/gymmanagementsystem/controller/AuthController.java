package com.gym.gymmanagementsystem.controller;

import com.gym.gymmanagementsystem.dto.AdminUserRegisterRequest;
import com.gym.gymmanagementsystem.dto.AuthRequest;
import com.gym.gymmanagementsystem.dto.AuthResponse;
import com.gym.gymmanagementsystem.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}) // Allow frontend origin
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register-admin")
    public ResponseEntity<?> registerAdmin(@Valid @RequestBody AdminUserRegisterRequest request) {
        try {
            authService.registerAdmin(request.getUsername(), request.getPassword());
            return ResponseEntity.status(HttpStatus.CREATED).body("Admin registered successfully!");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        try {
            String token = authService.login(request.getUsername(), request.getPassword());
            AuthResponse response = new AuthResponse();
            response.setToken(token);
            response.setUsername(request.getUsername());
            response.setMessage("Login successful!");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            AuthResponse errorResponse = new AuthResponse();
            errorResponse.setMessage(e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
    }
}