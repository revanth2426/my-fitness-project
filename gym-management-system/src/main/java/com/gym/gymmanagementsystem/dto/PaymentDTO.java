package com.gym.gymmanagementsystem.dto;

import lombok.Data;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

@Data
public class PaymentDTO {
    private Integer paymentId;
    @NotNull(message = "User ID is required")
    @Min(value = 1, message = "User ID must be positive")
    private Integer userId;
    @NotNull(message = "Amount is required")
    @PositiveOrZero(message = "Amount must be positive or zero")
    private Double amount;

    private Double totalMembershipFee;

    private String membershipSession; // NEW FIELD

    @NotNull(message = "Payment date is required")
    private LocalDate paymentDate;
    @NotBlank(message = "Payment method is required")
    private String paymentMethod;

    private String paymentMethodDetail;

    private Integer membershipPlanId;
    private String transactionId;

    private String notes;

    private Integer originalPaymentId;
}