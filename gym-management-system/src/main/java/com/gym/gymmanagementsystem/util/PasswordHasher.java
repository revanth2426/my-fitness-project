package com.gym.gymmanagementsystem.util; // Ensure this package matches your folder structure

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder; // Import needed for BCrypt

public class PasswordHasher {

    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String rawPassword = "password123"; // <-- YOUR DESIRED ADMIN PASSWORD HERE
        String hashedPassword = encoder.encode(rawPassword);
        System.out.println("--------------------------------------------------");
        System.out.println("Hashed Password for '" + rawPassword + "':");
        System.out.println(hashedPassword);
        System.out.println("--------------------------------------------------");
    }
}