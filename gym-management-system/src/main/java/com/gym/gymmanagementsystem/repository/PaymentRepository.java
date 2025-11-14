package com.gym.gymmanagementsystem.repository;

import com.gym.gymmanagementsystem.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Integer> {
    // Custom query to find payments by user ID
    List<Payment> findByUserUserId(Integer userId);
    // Custom query for analytics (e.g., sum of amounts within a date range)
    List<Payment> findByPaymentDateBetween(LocalDate startDate, LocalDate endDate);

    // NEW METHOD: Find all payments with dueAmount greater than 0
    List<Payment> findByDueAmountGreaterThan(Double dueAmount);
}