package com.gym.gymmanagementsystem.repository;

import com.gym.gymmanagementsystem.model.MembershipPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MembershipPlanRepository extends JpaRepository<MembershipPlan, Integer> {
}