package com.planner.mapper;

import com.planner.domain.ProjectRequest;
import com.planner.domain.ProjectResponse;
import com.planner.model.entity.ProjectEntity;
import org.springframework.stereotype.Component;

@Component
public class ProjectMapper {

    /**
     * Maps a ProjectEntity to a ProjectResponse DTO.
     *
     * @param entity the project entity
     * @return the project response DTO
     */
    public ProjectResponse toResponse(ProjectEntity entity) {
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
                entity.getUpdatedAt()
        );
    }

    /**
     * Maps a ProjectRequest DTO to a new ProjectEntity.
     *
     * @param request the project request DTO
     * @return a new project entity
     */
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

    /**
     * Updates an existing ProjectEntity with data from a ProjectRequest.
     * Does not update id, timestamps, or lastAccessedAt.
     *
     * @param request the project request DTO
     * @param entity the existing project entity to update
     */
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
