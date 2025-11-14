package com.gym.gymmanagementsystem.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "trainers")
@Data
public class Trainer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Auto-incrementing ID
    @Column(name = "trainer_id")
    private Integer trainerId;

    @Column(name = "name", nullable = false)
    private String name;

    private Integer experience; // Years of experience

    private String specialization;

    private String availability; // e.g., "Mon-Fri 8-12", "Full-time"

    // Optional: Relationship to Users (ManyToMany if one user can have many trainers, and vice-versa)
    // For simplicity, we'll assign one trainer to one user via User entity field later.
}