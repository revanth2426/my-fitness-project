package com.gym.gymmanagementsystem.dto;

import lombok.Data;
import java.time.LocalDate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;

@Data
public class UserDTO {
    private Integer userId;

    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "Age is required")
    private Integer age;

    @NotBlank(message = "Gender is required")
    private String gender;

    @NotBlank(message = "Contact number is required")
    @Pattern(regexp = "^\\d{10}$", message = "Contact number must be 10 digits")
    private String contactNumber;

    private String membershipStatus; // Frontend sends this, but backend often derives

    @PastOrPresent(message = "Joining date cannot be in the future")
    @NotNull(message = "Joining date is required")
    private LocalDate joiningDate;

    // FIX: This field *must* allow null if you want to explicitly remove a plan.
    // The 'required' attribute on the <select> in frontend will still enforce selection for ADD/EDIT from form.
    // But when sending null via 'X' button, this must be nullable.
    // REMOVED @NotNull
    private Integer selectedPlanId;

    // No need to send these from frontend, backend calculates them based on selectedPlanId
    // private LocalDate selectedPlanStartDate;
    // private LocalDate selectedPlanEndDate;
}