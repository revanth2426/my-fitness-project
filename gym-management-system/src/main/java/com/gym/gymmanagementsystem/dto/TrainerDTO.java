package com.gym.gymmanagementsystem.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
public class TrainerDTO {
    private Integer trainerId; // Optional for creation

    @NotBlank(message = "Trainer name is required")
    private String name;

    @NotNull(message = "Experience is required")
    private Integer experience;

    private String specialization;

    private String availability;
}