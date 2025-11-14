package com.gym.gymmanagementsystem.repository;

import com.gym.gymmanagementsystem.model.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AdminUserRepository extends JpaRepository<AdminUser, Integer> {
    // Custom method to find an AdminUser by username, crucial for authentication
    Optional<AdminUser> findByUsername(String username);
}