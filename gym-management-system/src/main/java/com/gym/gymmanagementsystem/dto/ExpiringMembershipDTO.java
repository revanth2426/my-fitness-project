package com.gym.gymmanagementsystem.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class ExpiringMembershipDTO {
    private Integer assignmentId;
    private String userName;
    private String planName;
    private LocalDate endDate;
    private String userId; // Optional, if needed
    private Integer planId; // Optional, if needed
}