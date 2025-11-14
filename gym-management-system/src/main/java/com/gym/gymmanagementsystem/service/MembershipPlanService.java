package com.gym.gymmanagementsystem.service;

import com.gym.gymmanagementsystem.dto.MembershipPlanDTO;
import com.gym.gymmanagementsystem.model.MembershipPlan;
import com.gym.gymmanagementsystem.repository.MembershipPlanRepository;
import com.gym.gymmanagementsystem.repository.UserRepository; // Keep UserRepository if still used
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate; // Keep if needed for date logic (e.g., expiring memberships if handled here)
import java.util.List;
import java.util.Optional;


@Service
public class MembershipPlanService {

    @Autowired
    private MembershipPlanRepository planRepository;

    // REMOVED PlanAssignmentRepository injection
    // REMOVED UserRepository injection (if it's only used for PlanAssignment logic which is now gone)

    public MembershipPlan addPlan(MembershipPlan plan) {
        return planRepository.save(plan);
    }

    public List<MembershipPlan> getAllPlans() {
        return planRepository.findAll();
    }

    public Optional<MembershipPlan> getPlanById(Integer planId) {
        return planRepository.findById(planId);
    }

    public MembershipPlan updatePlan(Integer planId, MembershipPlanDTO planDTO) {
        MembershipPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Membership Plan not found with id: " + planId));

        // Copy properties from DTO to entity
        plan.setPlanName(planDTO.getPlanName());
        plan.setPrice(planDTO.getPrice());
        plan.setDurationMonths(planDTO.getDurationMonths());
        plan.setFeaturesList(planDTO.getFeaturesList());

        return planRepository.save(plan);
    }

    public void deletePlan(Integer planId) {
        planRepository.deleteById(planId);
    }

    // REMOVED all methods related to PlanAssignment (e.g., assignPlanToUser, getPlanAssignmentsByUserId)
}