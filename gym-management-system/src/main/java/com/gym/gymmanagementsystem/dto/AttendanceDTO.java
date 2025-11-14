package com.gym.gymmanagementsystem.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class AttendanceDTO {
    // Only userId is needed for check-in via API
    @NotBlank(message = "User ID is required for attendance")
    private String userId;
}