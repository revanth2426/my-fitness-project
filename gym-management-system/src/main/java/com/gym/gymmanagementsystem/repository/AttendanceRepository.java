package com.gym.gymmanagementsystem.repository;

import com.gym.gymmanagementsystem.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;


@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Integer> {

    @Override
    @EntityGraph(value = "Attendance.withUser")
    Page<Attendance> findAll(Pageable pageable);

    @EntityGraph(value = "Attendance.withUser")
    Optional<Attendance> findByUserUserIdAndAttendanceDate(Integer userId, LocalDate attendanceDate);

    // NEW METHOD: Find all attendance records for a specific date where check_out_time is NULL
    List<Attendance> findByCheckOutTimeIsNullAndAttendanceDate(LocalDate attendanceDate);

    List<Attendance> findByAttendanceDateBetween(LocalDate startDate, LocalDate endDate);

}