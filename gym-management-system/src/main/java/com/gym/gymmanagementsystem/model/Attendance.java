package com.gym.gymmanagementsystem.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.time.LocalDate; // NEW IMPORT: for attendanceDate
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "attendance") // REVERTED: Now points to the *temporary* 'attendance' table
@Data
@NamedEntityGraph(
    name = "Attendance.withUser",
    attributeNodes = {
        @NamedAttributeNode("user")
    }
)
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attendance_id")
    private Integer attendanceId;

    @JsonBackReference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "check_in_time", nullable = false) // REVERTED/CONFIRMED: Column name is 'check_in_time'
    private LocalDateTime checkInTime; // Field name

    @Column(name = "check_out_time") // REVERTED/CONFIRMED: Column name is 'check_out_time'
    private LocalDateTime checkOutTime; // Field name

    @Column(name = "time_spent_minutes")
    private Long timeSpentMinutes;

    @Column(name = "attendance_date", nullable = false) // NEW/CONFIRMED: Maps to the new 'attendance_date' in the temporary table
    private LocalDate attendanceDate; // Field name
}