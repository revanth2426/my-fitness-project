package com.gym.gymmanagementsystem.repository;

import com.gym.gymmanagementsystem.model.Trainer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TrainerRepository extends JpaRepository<Trainer, Integer> {
    // <Trainer, Integer> because Trainer's primary key is Integer (trainerId).
}