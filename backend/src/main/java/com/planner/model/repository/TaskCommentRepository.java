package com.planner.model.repository;

import com.planner.model.entity.TaskCommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TaskCommentRepository extends JpaRepository<TaskCommentEntity, UUID> {
    // Spring Data JPA provides basic CRUD operations
    // Additional custom queries can be added here if needed
}
