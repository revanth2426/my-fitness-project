package com.gym.gymmanagementsystem.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "name", nullable = false)
    private String name;

    private Integer age;

    private String gender;

    @Column(name = "contact_number")
    private String contactNumber;

    @Column(name = "membership_status")
    private String membershipStatus;

    @Column(name = "joining_date", nullable = false)
    private LocalDate joiningDate;

    @Column(name = "current_plan_id")
    private Integer currentPlanId;

    @Column(name = "current_plan_start_date")
    private LocalDate currentPlanStartDate;

    @Column(name = "current_plan_end_date")
    private LocalDate currentPlanEndDate;

    @JsonManagedReference
    // MODIFIED: 'mappedBy' refers to the 'user' field in the Attendance entity (which now maps to the 'attendance' table)
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private java.util.List<Attendance> attendanceRecords;
}