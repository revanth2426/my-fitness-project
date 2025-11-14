package com.gym.gymmanagementsystem.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "admin_users")
@Data
public class AdminUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "admin_id")
    private Integer adminId;

    @Column(name = "username", nullable = false, unique = true)
    private String username;

    @Column(name = "password", nullable = false)
    private String password; // Will store hashed password

    @Column(nullable = false)
    private String role = "ADMIN"; // Default role
}