package com.gym.gymmanagementsystem.controller;

import com.gym.gymmanagementsystem.dto.AttendanceDTO;
import com.gym.gymmanagementsystem.dto.AttendanceResponseDTO;
import com.gym.gymmanagementsystem.dto.ErrorResponseDTO; // NEW IMPORT
import com.gym.gymmanagementsystem.model.Attendance;
import com.gym.gymmanagementsystem.service.AttendanceService;
import com.gym.gymmanagementsystem.service.AttendanceSummaryService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class AttendanceController {

    @Autowired
    private AttendanceService attendanceService;

    @Autowired
    private AttendanceSummaryService attendanceSummaryService;

    @PostMapping("/record")
    public ResponseEntity<?> recordAttendance(@Valid @RequestBody AttendanceDTO attendanceDTO) { // CHANGED return type to ResponseEntity<?>
        try {
            Integer userIdInt = Integer.parseInt(attendanceDTO.getUserId());
            AttendanceResponseDTO dto = attendanceService.recordOrUpdateAttendance(userIdInt);
            return new ResponseEntity<>(dto, HttpStatus.OK);
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                 .body(new ErrorResponseDTO("Invalid User ID format.", HttpStatus.BAD_REQUEST.value(), System.currentTimeMillis()));
        } catch (RuntimeException e) {
            // Return specific message from RuntimeException in a consistent ErrorResponseDTO
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                 .body(new ErrorResponseDTO(e.getMessage(), HttpStatus.BAD_REQUEST.value(), System.currentTimeMillis()));
        }
    }
    // ... rest of the controller remains the same ...

    // Re-check other endpoints that return `ResponseEntity<?>` or adjust them similarly for errors if needed.
    // For now, only the /record endpoint needs this granular error handling via ErrorResponseDTO.

    @GetMapping("/status/user/{userId}")
    public ResponseEntity<AttendanceResponseDTO> getTodayAttendanceStatus(@PathVariable String userId) {
        try {
            Integer userIdInt = Integer.parseInt(userId);
            Optional<AttendanceResponseDTO> status = attendanceService.getAttendanceStatusForToday(userIdInt);
            return status.map(ResponseEntity::ok)
                         .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Attendance>> getAttendanceByUserId(@PathVariable String userId) {
        try {
            List<Attendance> attendanceRecords = attendanceService.getAttendanceByUserId(userId);
            return ResponseEntity.ok(attendanceRecords);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/daily-counts")
    public ResponseEntity<Map<LocalDate, Long>> getDailyAttendanceCounts(
            @RequestParam(name = "startDate") LocalDate startDate,
            @RequestParam(name = "endDate") LocalDate endDate) {
        Map<LocalDate, Long> dailyCounts = attendanceService.getDailyAttendanceCount(startDate, endDate);
        return ResponseEntity.ok(dailyCounts);
    }

    @GetMapping("/all")
    public ResponseEntity<Page<AttendanceResponseDTO>> getAllAttendance(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("checkInTime").descending());
        Page<AttendanceResponseDTO> attendancePage = attendanceService.getAllAttendanceRecords(pageable);
        return ResponseEntity.ok(attendancePage);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAttendance(@PathVariable("id") Integer attendanceId) {
        try {
            attendanceService.deleteAttendanceRecord(attendanceId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/generate-summaries")
    public ResponseEntity<String> generateSummaries() {
        try {
            if (!attendanceSummaryService.hasPendingAttendanceRecordsForSummary()) {
                return ResponseEntity.ok("No new or modified completed attendance records found to generate summaries.");
            }

            attendanceSummaryService.generateAttendanceSummaries();
            return ResponseEntity.ok("Attendance summaries generated/updated successfully!");
        } catch (Exception e) {
            System.err.println("Error generating attendance summaries: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body("Failed to generate attendance summaries: " + e.getMessage());
        }
    }

    @PostMapping("/checkout-all")
    public ResponseEntity<String> checkOutAll() {
        try {
            int checkedOutCount = attendanceService.checkOutAllUsers();
            String message = checkedOutCount > 0
                             ? String.format("Successfully checked out %d active users.", checkedOutCount)
                             : "No users found checked in today.";

            if(checkedOutCount > 0) {
                attendanceSummaryService.generateAttendanceSummaries();
                message += " Summaries updated.";
            }

            return ResponseEntity.ok(message);
        } catch (Exception e) {
            System.err.println("Error checking out all users: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body("Failed to check out all users: " + e.getMessage());
        }
    }
}