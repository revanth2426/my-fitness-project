package com.gym.gymmanagementsystem.controller;

import com.gym.gymmanagementsystem.dto.MembershipPlanDTO;
import com.gym.gymmanagementsystem.model.MembershipPlan;
import com.gym.gymmanagementsystem.service.MembershipPlanService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/plans")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class MembershipPlanController {

    @Autowired
    private MembershipPlanService membershipPlanService;

    @PostMapping
    public ResponseEntity<MembershipPlan> addPlan(@Valid @RequestBody MembershipPlanDTO planDTO) {
        MembershipPlan plan = new MembershipPlan();
        plan.setPlanName(planDTO.getPlanName());
        plan.setPrice(planDTO.getPrice());
        plan.setDurationMonths(planDTO.getDurationMonths());
        plan.setFeaturesList(planDTO.getFeaturesList());

        MembershipPlan savedPlan = membershipPlanService.addPlan(plan);
        return new ResponseEntity<>(savedPlan, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<MembershipPlan>> getAllPlans() {
        List<MembershipPlan> plans = membershipPlanService.getAllPlans();
        return ResponseEntity.ok(plans);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MembershipPlan> getPlanById(@PathVariable("id") Integer planId) {
        Optional<MembershipPlan> plan = membershipPlanService.getPlanById(planId);
        return plan.map(ResponseEntity::ok)
                   .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<MembershipPlan> updatePlan(@PathVariable("id") Integer planId, @Valid @RequestBody MembershipPlanDTO planDTO) {
        try {
            MembershipPlan updatedPlan = membershipPlanService.updatePlan(planId, planDTO);
            return ResponseEntity.ok(updatedPlan);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlan(@PathVariable("id") Integer planId) {
        try {
            membershipPlanService.deletePlan(planId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}