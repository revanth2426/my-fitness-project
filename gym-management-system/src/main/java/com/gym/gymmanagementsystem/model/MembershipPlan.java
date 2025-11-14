package com.gym.gymmanagementsystem.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "membership_plans")
@Data
public class MembershipPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "plan_id")
    private Integer planId;

    @Column(name = "plan_name", nullable = false, unique = true)
    private String planName;

    @Column(nullable = false)
    private Double price;

    @Column(name = "duration_months", nullable = false)
    private Integer durationMonths;

    @Column(name = "features_list", columnDefinition = "TEXT")
    private String featuresList; // Store as JSON string or comma-separated for simplicity
}