// D:\Gym-Project\Project\gym-management-system\src\main\java\com\gym\gymmanagementsystem\service\AttendanceService.java (Complete Updated File)

package com.gym.gymmanagementsystem.service;

import com.gym.gymmanagementsystem.model.Attendance;
import com.gym.gymmanagementsystem.model.User;
import com.gym.gymmanagementsystem.repository.AttendanceRepository;
import com.gym.gymmanagementsystem.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value; // NEW IMPORT
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import com.gym.gymmanagementsystem.dto.AttendanceResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class AttendanceService {

    private static final Logger logger = LoggerFactory.getLogger(AttendanceService.class);

    @Autowired
    private AttendanceRepository attendanceRepository;
    @Autowired
    private UserRepository userRepository;

    // NEW: Inject configurable minimum stay time
    @Value("${attendance.min-stay-minutes:10}") // Default to 10 if property is missing
    private int minStayMinutes;

    private AttendanceResponseDTO convertToDto(Attendance attendance) {
        AttendanceResponseDTO dto = new AttendanceResponseDTO();
        dto.setAttendanceId(attendance.getAttendanceId());
        dto.setUserId(attendance.getUser() != null ? attendance.getUser().getUserId() : null);
        dto.setUserName(attendance.getUser() != null ? attendance.getUser().getName() : "N/A");
        dto.setCheckInTime(attendance.getCheckInTime());
        dto.setCheckOutTime(attendance.getCheckOutTime());
        if (attendance.getCheckInTime() != null && attendance.getCheckOutTime() != null) {
            Duration duration = Duration.between(attendance.getCheckInTime(), attendance.getCheckOutTime());
            dto.setTimeSpentMinutes(duration.toMinutes());
        } else {
            dto.setTimeSpentMinutes(null);
        }
        return dto;
    }

    public Optional<AttendanceResponseDTO> getAttendanceStatusForToday(Integer userId) {
        LocalDate today = LocalDate.now();
        return attendanceRepository.findByUserUserIdAndAttendanceDate(userId, today)
                .map(this::convertToDto);
    }

    @Transactional
    public AttendanceResponseDTO recordOrUpdateAttendance(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        // NEW VALIDATION: Check user's membership status before allowing attendance
        if (!"Active".equalsIgnoreCase(user.getMembershipStatus()) && 
            (user.getCurrentPlanEndDate() == null || user.getCurrentPlanEndDate().isBefore(LocalDate.now()))) {
            throw new RuntimeException("User's membership is not active. Status: " + user.getMembershipStatus() + ".");
        }
        if ("Expired".equalsIgnoreCase(user.getMembershipStatus())) {
            throw new RuntimeException("User's membership has expired. Please renew the plan.");
        }
        if ("Inactive".equalsIgnoreCase(user.getMembershipStatus())) {
            throw new RuntimeException("User's membership is inactive. Please assign a plan.");
        }


        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();

        Optional<Attendance> existingAttendance = attendanceRepository.findByUserUserIdAndAttendanceDate(userId, today);
        if (existingAttendance.isPresent()) {
            Attendance attendance = existingAttendance.get();
            if (attendance.getCheckOutTime() == null) {
                // User has checked in but not checked out, so this is a CHECK-OUT action
                if (now.isBefore(attendance.getCheckInTime())) {
                    throw new RuntimeException("Check-out time cannot be before check-in time.");
                }

                Duration durationSinceCheckIn = Duration.between(attendance.getCheckInTime(), now);
                // USE INJECTED VALUE
                if (durationSinceCheckIn.toMinutes() < minStayMinutes) { 
                    throw new RuntimeException("Check-out not allowed. User must stay at least " + minStayMinutes + " minutes (current duration: " + durationSinceCheckIn.toMinutes() + " minutes)."); 
                }

                attendance.setCheckOutTime(now); 
                Duration totalDuration = Duration.between(attendance.getCheckInTime(), now);
                attendance.setTimeSpentMinutes(totalDuration.toMinutes());

                return convertToDto(attendanceRepository.save(attendance));
            } else {
                // MODIFIED ERROR MESSAGE: User has already checked in AND checked out today
                throw new RuntimeException("User has already checked in and checked out today at " + attendance.getCheckOutTime().toLocalTime() + ".");
            }
        } else {
            // No attendance record for today, so this is a CHECK-IN action
            Attendance newAttendance = new Attendance();
            newAttendance.setUser(user);
            newAttendance.setCheckInTime(now);
            newAttendance.setAttendanceDate(today);
            return convertToDto(attendanceRepository.save(newAttendance));
        }
    }

    public List<Attendance> getAttendanceByUserId(String userId) {
         try {
            Integer intUserId = Integer.parseInt(userId);
            User user = userRepository.findById(intUserId)
                    .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
            return user.getAttendanceRecords();
         } catch (NumberFormatException e) {
             throw new RuntimeException("Invalid User ID format: " + userId);
         }
    }

    public Map<LocalDate, Long> getDailyAttendanceCount(LocalDate startDate, LocalDate endDate) {
        List<Attendance> attendanceList = attendanceRepository.findAll(); 
        return attendanceList.stream()
                .filter(a -> !a.getCheckInTime().toLocalDate().isBefore(startDate) && 
                           !a.getCheckInTime().toLocalDate().isAfter(endDate))
                .collect(Collectors.groupingBy(
                        a -> a.getCheckInTime().toLocalDate(),
                        Collectors.counting()
                ));
    }

    public Page<AttendanceResponseDTO> getAllAttendanceRecords(Pageable pageable) {
        Page<Attendance> attendancePage = attendanceRepository.findAll(pageable);
        return attendancePage.map(this::convertToDto);
    }

    public void deleteAttendanceRecord(Integer attendanceId) {
        if (!attendanceRepository.existsById(attendanceId)) { 
            throw new RuntimeException("Attendance record not found with ID: " + attendanceId);
        }
        attendanceRepository.deleteById(attendanceId); 
    }

    @Transactional
    public int checkOutAllUsers() {
        LocalDate today = LocalDate.now();
        List<Attendance> activeAttendances = attendanceRepository.findByCheckOutTimeIsNullAndAttendanceDate(today);

        int checkedOutCount = 0;
        LocalDateTime now = LocalDateTime.now();
        for (Attendance attendance : activeAttendances) {
            // NEW VALIDATION: Ensure user is still "Active" before checking them out
            if (!"Active".equalsIgnoreCase(attendance.getUser().getMembershipStatus()) &&
                (attendance.getUser().getCurrentPlanEndDate() == null || attendance.getUser().getCurrentPlanEndDate().isBefore(LocalDate.now()))) {
                logger.info("Skipping check-out for non-active user: " + attendance.getUser().getName() + " (ID: " + attendance.getUser().getUserId() + "). Status: " + attendance.getUser().getMembershipStatus() + ".");
                continue; // Skip inactive/expired users
            }


            if (attendance.getCheckInTime() != null) { 
                Duration durationSinceCheckIn = Duration.between(attendance.getCheckInTime(), now);
                // USE INJECTED VALUE
                if (durationSinceCheckIn.toMinutes() < minStayMinutes) { 
                    logger.info("Skipping check-out for user " + attendance.getUser().getUserId() +
                                                  " (less than " + minStayMinutes + " minutes stay: " + durationSinceCheckIn.toMinutes() + " min).");
                    continue; 
                }
            } else {
                logger.info("Skipping check-out for user " + attendance.getUser().getUserId() + " (missing check-in time).");
                continue;
            }

            if (now.isAfter(attendance.getCheckInTime())) {
                attendance.setCheckOutTime(now);
                Duration duration = Duration.between(attendance.getCheckInTime(), now);
                attendance.setTimeSpentMinutes(duration.toMinutes());
                attendanceRepository.save(attendance);
                checkedOutCount++;
            }
        }
        return checkedOutCount;
    }
}