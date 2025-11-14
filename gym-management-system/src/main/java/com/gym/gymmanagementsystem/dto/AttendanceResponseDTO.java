package com.gym.gymmanagementsystem.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AttendanceResponseDTO {
    private Integer attendanceId;
    private Integer userId; // The actual user ID
    private String userName; // The name of the user
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private Long timeSpentMinutes; // NEW FIELD
}