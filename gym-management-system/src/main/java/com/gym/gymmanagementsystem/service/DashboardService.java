// D:\Gym-Project\Project\gym-management-system\src\main\java\com\gym\gymmanagementsystem\service\DashboardService.java (Complete Updated File)

package com.gym.gymmanagementsystem.service;

import com.gym.gymmanagementsystem.model.MembershipPlan;
import com.gym.gymmanagementsystem.model.User;
import com.gym.gymmanagementsystem.repository.MembershipPlanRepository;
import com.gym.gymmanagementsystem.repository.TrainerRepository;
import com.gym.gymmanagementsystem.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest; 
import org.springframework.data.domain.Pageable;   
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.gym.gymmanagementsystem.dto.ExpiringMembershipDTO;

// NEW IMPORTS FOR LOGGING
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class DashboardService {
    
    // NEW LOGGER FIELD
    private static final Logger logger = LoggerFactory.getLogger(DashboardService.class);

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TrainerRepository trainerRepository;

    @Autowired
    private MembershipPlanRepository membershipPlanRepository;
    @Autowired
    private AttendanceService attendanceService;

    public long getTotalActiveMembers() {
        // Rely on the membershipStatus field being updated correctly by UserService
        return userRepository.findAll().stream()
                .filter(user -> "Active".equalsIgnoreCase(user.getMembershipStatus()))
                .count();
    }

    public List<ExpiringMembershipDTO> getMembershipsExpiringSoon(int days) {
        LocalDate today = LocalDate.now();
        LocalDate cutoffDate = today.plusDays(days);

        return userRepository.findAll().stream()
                .filter(user -> user.getCurrentPlanId() != null && // Must have a plan
                                user.getCurrentPlanEndDate() != null &&
                                !user.getCurrentPlanEndDate().isBefore(today) && // End date is today or in future
                                !user.getCurrentPlanEndDate().isAfter(cutoffDate)) // End date is within the cutoff period
                .map(user -> {
                    ExpiringMembershipDTO dto = new ExpiringMembershipDTO();
                    dto.setUserId(String.valueOf(user.getUserId()));
                    dto.setUserName(user.getName());
                    dto.setPlanId(user.getCurrentPlanId());
                    dto.setEndDate(user.getCurrentPlanEndDate());

                    if (user.getCurrentPlanId() != null) {
                        membershipPlanRepository.findById(user.getCurrentPlanId()).ifPresentOrElse(plan -> {
                            dto.setPlanName(plan.getPlanName());
                        }, () -> {
                            logger.warn("Plan ID {} found on user {} but MembershipPlan entity is missing.", user.getCurrentPlanId(), user.getUserId());
                            dto.setPlanName("Unknown/Deleted Plan"); // Better descriptive fallback
                        });
                    } else {
                        dto.setPlanName("N/A");
                    }
                    return dto;
                }).collect(Collectors.toList());
    }

    public long getTotalTrainers() {
        return trainerRepository.count();
    }

    public Map<String, Long> getPlanDistribution() {
        // Collect Active members and group them by plan name.
        return userRepository.findAll().stream()
                .filter(user -> "Active".equalsIgnoreCase(user.getMembershipStatus()))
                .collect(Collectors.groupingBy(
                        user -> {
                            // Only perform lookup for users who should have a plan
                            if (user.getCurrentPlanId() != null) {
                                MembershipPlan plan = membershipPlanRepository.findById(user.getCurrentPlanId()).orElse(null);
                                if (plan != null) {
                                    return plan.getPlanName();
                                } else {
                                    logger.warn("Active user {} has missing Plan ID: {}", user.getUserId(), user.getCurrentPlanId());
                                    return "Unknown/Deleted Plan";
                                }
                            }
                            return "No Plan Assigned"; // Should not happen for "Active" users, but as a fallback
                        },
                        Collectors.counting()
                ));
    }

    public Map<LocalDate, Long> getDailyAttendanceData(LocalDate startDate, LocalDate endDate) {
        return attendanceService.getDailyAttendanceCount(startDate, endDate);
    }

    // MODIFIED: Use UserRepository's findBySearchQuery
    public List<User> searchUsers(String query) {
        // Create a Pageable object for the search query. For a search dropdown,
        // we'll fetch a reasonable number of results (e.g., first 20).
        Pageable pageable = PageRequest.of(0, 20);

        // Call the comprehensive search method from UserRepository.
        return userRepository.findBySearchQuery(query, pageable).getContent();
    }

    public List<User> filterUsersByStatus(String status) {
        return userRepository.findByMembershipStatus(status);
    }
}