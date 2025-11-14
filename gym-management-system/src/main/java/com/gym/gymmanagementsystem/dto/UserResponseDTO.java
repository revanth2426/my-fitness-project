package com.gym.gymmanagementsystem.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class UserResponseDTO {
    private Integer userId;
    private String name;
    private Integer age;
    private String gender;
    private String contactNumber;
    private String membershipStatus;
    private LocalDate joiningDate;

    // Fields for current plan details
    private Integer currentPlanId;
    private String currentPlanName;
    private LocalDate currentPlanStartDate;
    private LocalDate currentPlanEndDate; // This is the calculated expiry date
    private boolean currentPlanIsActive; // This determines green/red status for the plan pill
}