package com.gym.gymmanagementsystem.service;

import com.gym.gymmanagementsystem.dto.TrainerDTO;
import com.gym.gymmanagementsystem.model.Trainer;
import com.gym.gymmanagementsystem.repository.TrainerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TrainerService {

    @Autowired
    private TrainerRepository trainerRepository;

    public Trainer addTrainer(Trainer trainer) {
        return trainerRepository.save(trainer);
    }

    public List<Trainer> getAllTrainers() {
        return trainerRepository.findAll();
    }

    public Optional<Trainer> getTrainerById(Integer trainerId) {
        return trainerRepository.findById(trainerId);
    }

    public Trainer updateTrainer(Integer trainerId, Trainer trainerDetails) {
        Trainer trainer = trainerRepository.findById(trainerId)
                .orElseThrow(() -> new RuntimeException("Trainer not found with id: " + trainerId));

        trainer.setName(trainerDetails.getName());
        trainer.setExperience(trainerDetails.getExperience());
        trainer.setSpecialization(trainerDetails.getSpecialization());
        trainer.setAvailability(trainerDetails.getAvailability());

        return trainerRepository.save(trainer);
    }
    // BEFORE: public Trainer updateTrainer(Integer trainerId, Trainer trainerDetails) {
public Trainer updateTrainer(Integer trainerId, TrainerDTO trainerDTO) { // Change parameter to TrainerDTO
    Trainer trainer = trainerRepository.findById(trainerId)
            .orElseThrow(() -> new RuntimeException("Trainer not found with id: " + trainerId));

    // Copy properties from DTO to entity
    trainer.setName(trainerDTO.getName());
    trainer.setExperience(trainerDTO.getExperience());
    trainer.setSpecialization(trainerDTO.getSpecialization());
    trainer.setAvailability(trainerDTO.getAvailability());

    return trainerRepository.save(trainer);
}

    public void deleteTrainer(Integer trainerId) {
        trainerRepository.deleteById(trainerId);
    }
}