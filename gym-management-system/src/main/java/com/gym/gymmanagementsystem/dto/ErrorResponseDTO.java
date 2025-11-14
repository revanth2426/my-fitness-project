package com.gym.gymmanagementsystem.dto;

import lombok.AllArgsConstructor; // NEW IMPORT
import lombok.Data;
import lombok.NoArgsConstructor; // NEW IMPORT

@Data
@AllArgsConstructor // Generates constructor with all fields
@NoArgsConstructor  // Generates no-argument constructor
public class ErrorResponseDTO {
    private String message;
    private int status; // HTTP status code
    private long timestamp; // When the error occurred
}