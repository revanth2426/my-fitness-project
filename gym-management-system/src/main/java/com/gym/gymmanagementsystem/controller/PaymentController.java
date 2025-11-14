package com.gym.gymmanagementsystem.controller;

import com.gym.gymmanagementsystem.dto.ErrorResponseDTO;
import com.gym.gymmanagementsystem.dto.PaymentDTO;
import com.gym.gymmanagementsystem.dto.PaymentResponseDTO;
import com.gym.gymmanagementsystem.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "https://srfitness-admin.netlify.app"})
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @PostMapping
    public ResponseEntity<?> addPayment(@Valid @RequestBody PaymentDTO paymentDTO) {
        try {
            PaymentResponseDTO newPayment = paymentService.addPayment(paymentDTO);
            return new ResponseEntity<>(newPayment, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                 .body(new ErrorResponseDTO(e.getMessage(), HttpStatus.BAD_REQUEST.value(), System.currentTimeMillis()));
        }
    }

@GetMapping
    public ResponseEntity<Page<PaymentResponseDTO>> getAllPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "paymentId,desc") String[] sort) { // FIX: Default sort to paymentId,desc (safer primary key)

        String sortField = sort[0];
        String sortDirection = sort[1];

        // Ensure the sort field is safe/known. For Payment entity, 'user' is the relationship.
        // We ensure we sort by simple Payment fields like paymentId, paymentDate, or amount
        if (sortField.equals("paymentDate") || sortField.equals("amount") || sortField.equals("paymentId")) {
            // Safe sort field
        } else {
            // Default to the safest sort if an ambiguous field like 'user' is passed
            sortField = "paymentId";
            sortDirection = "desc";
        }
        
        Sort.Direction direction = sortDirection.equalsIgnoreCase("desc") ?
            Sort.Direction.DESC : Sort.Direction.ASC;
        
        Sort sortBy = Sort.by(direction, sortField); // Use the validated field
        Pageable pageable = PageRequest.of(page, size, sortBy);
        Page<PaymentResponseDTO> paymentsPage = paymentService.getAllPayments(pageable);
        return ResponseEntity.ok(paymentsPage);
    }

    // NEW ENDPOINT: To fetch outstanding due payments
    @GetMapping("/outstanding-dues")
    public ResponseEntity<List<PaymentResponseDTO>> getOutstandingDuePayments() {
        List<PaymentResponseDTO> outstandingDues = paymentService.getOutstandingDuePayments();
        return ResponseEntity.ok(outstandingDues);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getPaymentsByUserId(@PathVariable("userId") Integer userId) {
        try {
            List<PaymentResponseDTO> payments = paymentService.getPaymentsByUserId(userId);
            return ResponseEntity.ok(payments);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                 .body(new ErrorResponseDTO(e.getMessage(), HttpStatus.NOT_FOUND.value(), System.currentTimeMillis()));
        }
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getPaymentAnalytics(
            @RequestParam(name = "startDate") LocalDate startDate,
            @RequestParam(name = "endDate") LocalDate endDate) {
        Map<String, Object> analytics = paymentService.getPaymentAnalytics(startDate, endDate);
        return ResponseEntity.ok(analytics);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePayment(@PathVariable("id") Integer paymentId) {
        try {
            paymentService.deletePayment(paymentId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // The PUT endpoint is intentionally commented out/returning NOT_IMPLEMENTED as it's not used for 'Pay Due'
    /*
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePayment(@PathVariable("id") Integer paymentId, @Valid @RequestBody PaymentDTO paymentDTO) {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build(); // Placeholder
    }
    */
}