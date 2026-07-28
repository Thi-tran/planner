package com.planner.mapper;

import com.planner.domain.*;
import com.planner.model.entity.ChecklistEntity;
import com.planner.model.entity.ChecklistTaskEntity;
import com.planner.model.entity.TaskCommentEntity;
import com.planner.model.entity.UserEntity;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class ChecklistMapper {
    
    public ChecklistResponse toResponse(ChecklistEntity entity) {
        return new ChecklistResponse(
                entity.getId(),
                entity.getProject().getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getColor(),
                entity.getTasks() != null 
                    ? entity.getTasks().stream()
                        .map(this::toTaskResponse)
                        .collect(Collectors.toList())
                    : Collections.emptyList(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
    
    public TaskResponse toTaskResponse(ChecklistTaskEntity entity) {
        UserSummary assignedToUser = entity.getAssignedToUser() != null
                ? toUserSummary(entity.getAssignedToUser())
                : null;
        
        return new TaskResponse(
                entity.getId(),
                entity.getChecklist().getId(),
                entity.getDescription(),
                entity.getAssignedToUser() != null ? entity.getAssignedToUser().getId() : null,
                assignedToUser,
                entity.getDeadline(),
                entity.getStatus().name().toLowerCase().replace('_', '-'),
                entity.getDisplayOrder(),
                entity.getComments() != null
                    ? entity.getComments().stream()
                        .map(this::toCommentResponse)
                        .collect(Collectors.toList())
                    : Collections.emptyList(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
    
    public TaskCommentResponse toCommentResponse(TaskCommentEntity entity) {
        return new TaskCommentResponse(
                entity.getId(),
                entity.getTask().getId(),
                entity.getUser().getId(),
                toUserSummary(entity.getUser()),
                entity.getCommentText(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
    
    public UserSummary toUserSummary(UserEntity entity) {
        return new UserSummary(
                entity.getId(),
                entity.getDisplayName(),
                entity.getEmail(),
                entity.getPictureUrl()
        );
    }
}
