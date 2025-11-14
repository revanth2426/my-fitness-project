package com.gym.gymmanagementsystem.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List; // Import List
import java.util.Map;  // Import Map

@Service
public class AttendanceSummaryService {

    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public AttendanceSummaryService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Checks if there are any new or updated completed attendance records in the
     * temporary 'attendance' table that would result in changes to 'daily_attendance'.
     * This considers records that are either not yet in 'daily_attendance' or
     * records where 'check_out_time' or 'time_spent_minutes' have changed in 'attendance'.
     *
     * @return true if there are records to process, false otherwise.
     */
    public boolean hasPendingAttendanceRecordsForSummary() {
        // This query identifies records in 'attendance' that are completed
        // AND either not in 'daily_attendance' yet (based on user_id, attendance_date)
        // OR have different check_out/time_spent_minutes values compared to what's in daily_attendance.
        String checkPendingSql = """
            SELECT EXISTS (
                SELECT 1
                FROM attendance att
                WHERE att.check_out_time IS NOT NULL AND att.time_spent_minutes IS NOT NULL
                AND NOT EXISTS (
                    SELECT 1
                    FROM daily_attendance da
                    WHERE da.user_id = att.user_id
                      AND da.attendance_date = att.attendance_date
                      AND da.check_in = att.check_in_time -- Assuming check_in is stable for matching
                      AND da.check_out = att.check_out_time
                      AND da.time_spent_minutes = att.time_spent_minutes
                )
            )
            """;
        // Execute the query and return true if any pending records exist.
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(checkPendingSql, Boolean.class));
    }


    /**
     * Aggregates attendance data from the temporary 'attendance' table
     * into the persistent 'daily_attendance', 'monthly_attendance_summary', and 'yearly_attendance_summary' tables.
     * This method is designed to be idempotent (can be run multiple times safely).
     * It relies on ON DUPLICATE KEY UPDATE for MySQL to either insert new summaries
     * or update existing ones.
     */
    @Transactional
    public void generateAttendanceSummaries() {
        // --- 0. Copy completed daily attendance from TEMPORARY 'attendance' to PERSISTENT 'daily_attendance' ---
        // This query inserts completed records from the temporary 'attendance' table
        // into the persistent 'daily_attendance' table.
        // It relies on the UNIQUE constraint on (user_id, attendance_date) in daily_attendance.
        String copyToPersistentDailySql = """
            INSERT INTO daily_attendance (user_id, check_in, check_out, time_spent_minutes, attendance_date)
            SELECT
                att.user_id,
                att.check_in_time,      -- Map from 'check_in_time' in temporary 'attendance' table
                att.check_out_time,     -- Map from 'check_out_time' in temporary 'attendance' table
                att.time_spent_minutes,
                att.attendance_date
            FROM
                attendance att           -- Source is the TEMPORARY 'attendance' table
            WHERE
                att.check_out_time IS NOT NULL     -- Only include completed sessions
                AND att.time_spent_minutes IS NOT NULL
            ON DUPLICATE KEY UPDATE
                -- Update existing records if the same user/date combination already exists
                -- This ensures idempotency for daily_attendance itself
                check_in = VALUES(check_in),
                check_out = VALUES(check_out),
                time_spent_minutes = VALUES(time_spent_minutes);
            """;
        jdbcTemplate.update(copyToPersistentDailySql);
        System.out.println("Completed attendance records copied to persistent daily_attendance successfully.");

        // --- 1. Aggregate Persistent Daily Attendance into Monthly Summary ---
        // Now, source for monthly summary is the PERSISTENT 'daily_attendance' table
        String monthlyAggregationSql = """
            INSERT INTO monthly_attendance_summary (user_id, year, month, total_present_days, total_minutes_spent)
            SELECT
                da.user_id,
                YEAR(da.attendance_date),
                MONTH(da.attendance_date),
                COUNT(DISTINCT da.attendance_date),
                SUM(da.time_spent_minutes)
            FROM
                daily_attendance da -- Source is PERSISTENT 'daily_attendance' table
            WHERE
                da.check_out IS NOT NULL -- Always ensure completed sessions are summarized
                AND da.time_spent_minutes IS NOT NULL
            GROUP BY
                da.user_id,
                YEAR(da.attendance_date),
                MONTH(da.attendance_date)
            ON DUPLICATE KEY UPDATE
                total_present_days = VALUES(total_present_days),
                total_minutes_spent = VALUES(total_minutes_spent);
            """;
        jdbcTemplate.update(monthlyAggregationSql);
        System.out.println("Monthly attendance summaries generated/updated successfully.");

        // --- 2. Aggregate Monthly Summary into Yearly Summary ---
        String yearlyAggregationSql = """
            INSERT INTO yearly_attendance_summary (user_id, year, total_present_days, total_minutes_spent)
            SELECT
                mas.user_id,
                mas.year,
                SUM(mas.total_present_days),
                SUM(mas.total_minutes_spent)
            FROM
                monthly_attendance_summary mas
            GROUP BY
                mas.user_id,
                mas.year
            ON DUPLICATE KEY UPDATE
                total_present_days = VALUES(total_present_days),
                total_minutes_spent = VALUES(total_minutes_spent);
            """;
        jdbcTemplate.update(yearlyAggregationSql);
        System.out.println("Yearly attendance summaries generated/updated successfully.");
    }
}