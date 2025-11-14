package com.gym.gymmanagementsystem.repository;

import com.gym.gymmanagementsystem.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    @Override
    Page<User> findAll(Pageable pageable);
    Optional<User> findById(Integer userId);

    Optional<User> findByName(String name);

    List<User> findByMembershipStatus(String status);

    // Existing methods (if you define these, make sure they return Page)
    Page<User> findByUserId(Integer userId, Pageable pageable);
    Page<User> findByNameContainingIgnoreCase(String name, Pageable pageable);

    // NEW: More comprehensive search method for the `search` endpoint
    // This will search by name, user ID (as string), or contact number
    // IMPORTANT: This requires MySQL 8+ or PostgreSQL for CAST(u.userId AS string)
    // If you are using MySQL 5.7, use CONVERT(u.userId, CHAR) instead of CAST.
@Query("SELECT u FROM User u WHERE " +
           "LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "STR(u.userId) LIKE CONCAT('%', :query, '%') OR " + // <-- FIX APPLIED: Using STR()
           "LOWER(u.contactNumber) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<User> findBySearchQuery(@Param("query") String query, Pageable pageable);
    // You no longer need findAllByOrderByMembershipStatusAsc/Desc as findAll(Pageable) handles it.
}