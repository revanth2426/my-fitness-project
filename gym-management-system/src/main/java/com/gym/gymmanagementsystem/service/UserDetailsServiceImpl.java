package com.gym.gymmanagementsystem.service;

import com.gym.gymmanagementsystem.model.AdminUser;
import com.gym.gymmanagementsystem.repository.AdminUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User; // This is Spring Security's User class
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AdminUser adminUser = adminUserRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        // Convert your AdminUser to Spring Security's UserDetails object
        // Here we grant a single authority/role: "ROLE_ADMIN"
        return new User(
                adminUser.getUsername(),
                adminUser.getPassword(), // Hashed password
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + adminUser.getRole().toUpperCase())) // e.g., ROLE_ADMIN
        );
    }
}