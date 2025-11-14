package com.gym.gymmanagementsystem.controller;

import com.gym.gymmanagementsystem.dto.TrainerDTO;
import com.gym.gymmanagementsystem.model.Trainer;
import com.gym.gymmanagementsystem.service.TrainerService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/trainers")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class TrainerController {

    @Autowired
    private TrainerService trainerService;

    @PostMapping
    public ResponseEntity<Trainer> addTrainer(@Valid @RequestBody TrainerDTO trainerDTO) {
        Trainer trainer = new Trainer();
        trainer.setName(trainerDTO.getName());
        trainer.setExperience(trainerDTO.getExperience());
        trainer.setSpecialization(trainerDTO.getSpecialization());
        trainer.setAvailability(trainerDTO.getAvailability());
        // trainerId is auto-generated

        Trainer savedTrainer = trainerService.addTrainer(trainer);
        return new ResponseEntity<>(savedTrainer, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Trainer>> getAllTrainers() {
        List<Trainer> trainers = trainerService.getAllTrainers();
        return ResponseEntity.ok(trainers);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Trainer> getTrainerById(@PathVariable("id") Integer trainerId) {
        Optional<Trainer> trainer = trainerService.getTrainerById(trainerId);
        return trainer.map(ResponseEntity::ok)
                     .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Trainer> updateTrainer(@PathVariable("id") Integer trainerId, @Valid @RequestBody TrainerDTO trainerDTO) {
        try {
            Trainer updatedTrainer = trainerService.updateTrainer(trainerId, trainerDTO); // Pass DTO for update logic
            return ResponseEntity.ok(updatedTrainer);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTrainer(@PathVariable("id") Integer trainerId) {
        try {
            trainerService.deleteTrainer(trainerId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}