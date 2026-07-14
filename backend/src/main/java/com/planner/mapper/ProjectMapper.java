package com.planner.mapper;

import com.planner.domain.ProjectRequest;
import com.planner.domain.ProjectResponse;
import com.planner.model.entity.ProjectEntity;
import com.planner.model.entity.Role;
import org.springframework.stereotype.Component;

@Component
public class ProjectMapper {

    public ProjectResponse toResponse(ProjectEntity entity, Role role) {
        return new ProjectResponse(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getColor(),
                entity.getStatus(),
                entity.getLastAccessedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                role
        );
    }

    public ProjectResponse toResponse(ProjectEntity entity) {
        return toResponse(entity, null);
    }

    public ProjectEntity toEntity(ProjectRequest request) {
        return ProjectEntity.builder()
                .name(request.getName())
                .description(request.getDescription())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .color(request.getColor())
                .status(request.getStatus() != null ? request.getStatus() : "in progress")
                .build();
    }

    public void mapRequestToEntity(ProjectRequest request, ProjectEntity entity) {
        entity.setName(request.getName());
        entity.setDescription(request.getDescription());
        entity.setStartDate(request.getStartDate());
        entity.setEndDate(request.getEndDate());
        entity.setColor(request.getColor());
        if (request.getStatus() != null) {
            entity.setStatus(request.getStatus());
        }
    }
}
