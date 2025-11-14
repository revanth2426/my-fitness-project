package com.gym.gymmanagementsystem.dto;
import lombok.Data;
import java.time.LocalDate;

@Data
public class PaymentResponseDTO {
    private Integer paymentId;
    private Integer userId;
    private String userName;
    private Double amount;
    private Double dueAmount;
    private Double totalMembershipFee;
    private String membershipSession; // NEW FIELD
    private LocalDate paymentDate;
    private String paymentMethod;
    private String paymentMethodDetail;
    private Integer membershipPlanId;
    private String membershipPlanName;
    private String transactionId;
    private String notes;
}