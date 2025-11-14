package com.gym.gymmanagementsystem.controller;

import com.gym.gymmanagementsystem.model.User;
import com.gym.gymmanagementsystem.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.gym.gymmanagementsystem.dto.ExpiringMembershipDTO; // New import

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Long>> getDashboardSummary() {
        long totalActiveMembers = dashboardService.getTotalActiveMembers();
        long totalTrainers = dashboardService.getTotalTrainers();

        return ResponseEntity.ok(Map.of(
                "totalActiveMembers", totalActiveMembers,
                "totalTrainers", totalTrainers
        ));
    }

    // MODIFIED: Return List of ExpiringMembershipDTO
    @GetMapping("/expiring-memberships")
    public ResponseEntity<List<ExpiringMembershipDTO>> getExpiringMemberships(
            @RequestParam(name = "days", defaultValue = "7") int days) {
        List<ExpiringMembershipDTO> expiring = dashboardService.getMembershipsExpiringSoon(days);
        return ResponseEntity.ok(expiring);
    }

    @GetMapping("/plan-distribution")
    public ResponseEntity<Map<String, Long>> getPlanDistribution() {
        Map<String, Long> distribution = dashboardService.getPlanDistribution();
        return ResponseEntity.ok(distribution);
    }

    @GetMapping("/daily-attendance-chart")
    public ResponseEntity<Map<LocalDate, Long>> getDailyAttendanceChartData(
            @RequestParam(name = "startDate") LocalDate startDate,
            @RequestParam(name = "endDate") LocalDate endDate) {
        Map<LocalDate, Long> dailyData = dashboardService.getDailyAttendanceData(startDate, endDate);
        return ResponseEntity.ok(dailyData);
    }

    @GetMapping("/users/search")
    public ResponseEntity<List<User>> searchUsers(@RequestParam String query) {
        // This search will now fetch Users without planAssignments directly
        List<User> users = dashboardService.searchUsers(query);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/users/filter-status")
    public ResponseEntity<List<User>> filterUsersByStatus(@RequestParam String status) {
        List<User> users = dashboardService.filterUsersByStatus(status);
        return ResponseEntity.ok(users);
    }
}