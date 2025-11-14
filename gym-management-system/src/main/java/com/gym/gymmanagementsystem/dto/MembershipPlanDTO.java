package com.gym.gymmanagementsystem.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Data
public class MembershipPlanDTO {
    private Integer planId; // Optional for creation

    @NotBlank(message = "Plan name is required")
    private String planName;

    @NotNull(message = "Price is required")
    @Positive(message = "Price must be positive")
    private Double price;

    @NotNull(message = "Duration in months is required")
    @Positive(message = "Duration must be positive")
    private Integer durationMonths;

    private String featuresList;
}