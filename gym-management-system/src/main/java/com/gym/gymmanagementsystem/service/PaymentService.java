package com.gym.gymmanagementsystem.service;

import com.gym.gymmanagementsystem.dto.PaymentDTO;
import com.gym.gymmanagementsystem.dto.PaymentResponseDTO;
import com.gym.gymmanagementsystem.model.MembershipPlan;
import com.gym.gymmanagementsystem.model.Payment;
import com.gym.gymmanagementsystem.model.User;
import com.gym.gymmanagementsystem.repository.MembershipPlanRepository;
import com.gym.gymmanagementsystem.repository.PaymentRepository;
import com.gym.gymmanagementsystem.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class PaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);

    @Autowired
    private PaymentRepository paymentRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private MembershipPlanRepository membershipPlanRepository;
    @Autowired
    private UserService userService;

    // Helper to convert Payment entity to PaymentResponseDTO
    private PaymentResponseDTO convertToDto(Payment payment) {
        PaymentResponseDTO dto = new PaymentResponseDTO();
        dto.setPaymentId(payment.getPaymentId());
        dto.setUserId(payment.getUser().getUserId());
        dto.setUserName(payment.getUser().getName());
        dto.setAmount(payment.getAmount());
        dto.setDueAmount(payment.getDueAmount());
        dto.setTotalMembershipFee(payment.getTotalMembershipFee());
        dto.setMembershipSession(payment.getMembershipSession()); // NEW: Set membership session
        dto.setPaymentDate(payment.getPaymentDate());
        dto.setPaymentMethod(payment.getPaymentMethod());
        dto.setPaymentMethodDetail(payment.getPaymentMethodDetail());
        dto.setMembershipPlanId(payment.getMembershipPlanId());
        dto.setTransactionId(payment.getTransactionId());
        dto.setNotes(payment.getNotes());
        if (payment.getMembershipPlanId() != null) {
            membershipPlanRepository.findById(payment.getMembershipPlanId()).ifPresent(plan -> {
                dto.setMembershipPlanName(plan.getPlanName());
            });
        }
        return dto;
    }

    // Helper to generate membership session string
    private String generateMembershipSessionString(LocalDate startDate, int durationMonths) {
        if (startDate == null) return null; // Defensive check
        LocalDate endDate = startDate.plusMonths(durationMonths).minusDays(1); // End of the period

        // Format: "MMM yyyy" for start, and "MMM yyyy" for end
        DateTimeFormatter monthYearFormatter = DateTimeFormatter.ofPattern("MMM yyyy");

        String startMonthYear = startDate.format(monthYearFormatter);
        String endMonthYear = endDate.format(monthYearFormatter);

        if (durationMonths == 1) {
            return startMonthYear; // e.g., "Jan 2025"
        } else {
            return startMonthYear + " - " + endMonthYear; // e.g., "Jan 2025 - Apr 2025"
        }
    }

    @Transactional
    public PaymentResponseDTO addPayment(PaymentDTO paymentDTO) {
        User user = userRepository.findById(paymentDTO.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + paymentDTO.getUserId()));
        
        MembershipPlan selectedPlan = null;

        Payment payment = new Payment();
        payment.setUser(user);
        payment.setAmount(paymentDTO.getAmount());
        payment.setPaymentDate(paymentDTO.getPaymentDate());
        payment.setPaymentMethod(paymentDTO.getPaymentMethod());
        payment.setPaymentMethodDetail(paymentDTO.getPaymentMethodDetail());
        payment.setTransactionId(paymentDTO.getTransactionId());
        payment.setNotes(paymentDTO.getNotes());
        payment.setMembershipSession(paymentDTO.getMembershipSession()); // Set from DTO (if sent by frontend)


        if (paymentDTO.getOriginalPaymentId() != null) {
            // This is a new payment made towards an existing due.
            Payment originalPayment = paymentRepository.findById(paymentDTO.getOriginalPaymentId())
                    .orElseThrow(() -> new RuntimeException("Original payment not found with ID: " + paymentDTO.getOriginalPaymentId()));
            
            double newOriginalDue = originalPayment.getDueAmount() - paymentDTO.getAmount();
            originalPayment.setDueAmount(Math.max(0.0, newOriginalDue));
            paymentRepository.save(originalPayment); // Save the updated original payment

            // For the *new* payment record (the "due payment" transaction):
            payment.setTotalMembershipFee(0.0); // It's a payment towards a fee, not a full fee itself
            payment.setDueAmount(0.0); // This transaction itself has no due
            payment.setMembershipPlanId(originalPayment.getMembershipPlanId()); // Inherit plan ID
            payment.setMembershipSession(originalPayment.getMembershipSession()); // Inherit session from original payment

            logger.info("Updated original payment " + originalPayment.getPaymentId() + " due to: " + originalPayment.getDueAmount());

        } else {
            // This is a brand new payment (not a due payment)
            if (paymentDTO.getMembershipPlanId() != null) {
                selectedPlan = membershipPlanRepository.findById(paymentDTO.getMembershipPlanId())
                        .orElseThrow(() -> new RuntimeException("Membership Plan not found with ID: " + paymentDTO.getMembershipPlanId()));
                payment.setTotalMembershipFee(selectedPlan.getPrice()); // Total fee is the plan price
                payment.setMembershipPlanId(selectedPlan.getPlanId());
                payment.setMembershipSession(generateMembershipSessionString(paymentDTO.getPaymentDate(), selectedPlan.getDurationMonths())); // Generate session

                // Calculate due for this new payment based on plan price
                if (paymentDTO.getAmount() < selectedPlan.getPrice()) {
                    payment.setDueAmount(selectedPlan.getPrice() - paymentDTO.getAmount());
                } else {
                    payment.setDueAmount(0.0); // Fully paid or overpaid
                }

                // Process membership plan assignment/renewal for new payments
                if (user.getCurrentPlanId() != null && user.getCurrentPlanEndDate() != null && user.getCurrentPlanEndDate().isAfter(LocalDate.now())) {
                    // Renewal/Extension
                    LocalDate currentEndDate = user.getCurrentPlanEndDate();
                    
                    // FIX: Set the start date of the NEW period to the day after the old period expires
                    LocalDate newStartDate = currentEndDate.plusDays(1);
                    
                    user.setCurrentPlanEndDate(currentEndDate.plusMonths(selectedPlan.getDurationMonths()));
                    
                    // FIX: Update the start date and plan ID in case of a plan change during renewal
                    user.setCurrentPlanStartDate(newStartDate);
                    user.setCurrentPlanId(selectedPlan.getPlanId()); 
                    
                    logger.info("User " + user.getUserId() + " plan renewed/extended. New start date: " + user.getCurrentPlanStartDate() + ", New end date: " + user.getCurrentPlanEndDate());

                } else {
                    // New Assignment (or expired user paying for a new plan)
                    user.setCurrentPlanId(selectedPlan.getPlanId());
                    user.setCurrentPlanStartDate(paymentDTO.getPaymentDate());
                    user.setCurrentPlanEndDate(paymentDTO.getPaymentDate().plusMonths(selectedPlan.getDurationMonths()));
                    logger.info("User " + user.getUserId() + " new plan assigned. End date: " + user.getCurrentPlanEndDate());
                }
                userService.deriveAndSetUserStatus(user);
                userRepository.save(user);

            } else {
                // New payment, no plan selected (ad-hoc payment)
                payment.setTotalMembershipFee(paymentDTO.getAmount());
                payment.setDueAmount(0.0);
                payment.setMembershipPlanId(null);
                payment.setMembershipSession("Ad-hoc Payment"); // Default session for ad-hoc
            }
        }

        Payment savedPayment = paymentRepository.save(payment);
        return convertToDto(savedPayment);
    }
    

    public Page<PaymentResponseDTO> getAllPayments(Pageable pageable) {
        Page<Payment> paymentsPage = paymentRepository.findAll(pageable);
        return paymentsPage.map(this::convertToDto);
    }

    // NEW Method: Get all payments with outstanding due
    public List<PaymentResponseDTO> getOutstandingDuePayments() {
        return paymentRepository.findByDueAmountGreaterThan(0.0)
                                .stream()
                                .map(this::convertToDto)
                                .collect(Collectors.toList());
    }

    public PaymentResponseDTO getPaymentById(Integer paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found with ID: " + paymentId));
        return convertToDto(payment);
    }

    public List<PaymentResponseDTO> getPaymentsByUserId(Integer userId) {
        List<Payment> payments = paymentRepository.findByUserUserId(userId);
        if (payments.isEmpty()) {
            throw new RuntimeException("No payments found for user ID: " + userId);
        }
        return payments.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deletePayment(Integer paymentId) {
        if (!paymentRepository.existsById(paymentId)) {
            throw new RuntimeException("Payment record not found with ID: " + paymentId);
        }
        paymentRepository.deleteById(paymentId);
    }

    public Map<String, Object> getPaymentAnalytics(LocalDate startDate, LocalDate endDate) {
        List<Payment> payments = paymentRepository.findByPaymentDateBetween(startDate, endDate);
        double totalAmountCollected = payments.stream().mapToDouble(Payment::getAmount).sum();
        long totalPaymentsCount = payments.size();
        double totalDueAmount = payments.stream().mapToDouble(Payment::getDueAmount).sum();

        double totalExpectedAmount = payments.stream()
            .filter(p -> p.getTotalMembershipFee() != null)
            .mapToDouble(Payment::getTotalMembershipFee)
            .sum();

        Map<String, Double> amountByMethod = payments.stream()
                .collect(Collectors.groupingBy(Payment::getPaymentMethod, Collectors.summingDouble(Payment::getAmount)));
        double cashCollected = amountByMethod.getOrDefault("Cash", 0.0);
        double cardCollected = amountByMethod.getOrDefault("Card", 0.0);
        double onlineCollected = amountByMethod.getOrDefault("Online", 0.0);
        Map<String, Long> countByMethod = payments.stream()
                .collect(Collectors.groupingBy(Payment::getPaymentMethod, Collectors.counting()));
        Map<String, Double> amountByPlan = payments.stream()
                .filter(p -> p.getMembershipPlanId() != null)
                .collect(Collectors.groupingBy(p -> membershipPlanRepository.findById(p.getMembershipPlanId())
                        .map(MembershipPlan::getPlanName).orElse("Unknown Plan"),
                        Collectors.summingDouble(Payment::getAmount)));
        Map<String, Object> analytics = new HashMap<>();
        analytics.put("totalAmountCollected", totalAmountCollected);
        analytics.put("totalPaymentsCount", totalPaymentsCount);
        analytics.put("totalDueAmount", totalDueAmount);
        analytics.put("totalExpectedAmount", totalExpectedAmount);
        analytics.put("cashCollected", cashCollected);
        analytics.put("cardCollected", cardCollected);
        analytics.put("onlineCollected", onlineCollected);
        analytics.put("amountByPaymentMethod", amountByMethod);
        analytics.put("countByPaymentMethod", countByMethod);
        analytics.put("amountByMembershipPlan", amountByPlan);

        return analytics;
    }
}