package com.planner.mapper;

import com.planner.domain.EventRequest;
import com.planner.domain.EventResponse;
import com.planner.model.EventEntity;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting between EventEntity, EventRequest, and EventResponse.
 * 
 * Provides conversion logic between the JPA entity layer and the API DTO layer.
 * This separation allows the API contract to evolve independently of the database schema.
 */
@Component
public class EventMapper {

    /**
     * Converts an EventEntity entity to EventResponse (for API responses).
     * 
     * Maps JPA entity fields to response DTO fields.
     * All fields are copied, including audit timestamps.
     * Includes categoryId and resolvedColor for category-aware display.
     * 
     * @param entity the EventEntity entity to convert
     * @return an EventResponse with the entity's data
     */
    public EventResponse toResponse(EventEntity entity) {
        return new EventResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getStartTime(),
                entity.getEndTime(),
                entity.getCategory() != null ? entity.getCategory().getId() : null,
                entity.resolvedColor(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    /**
     * Maps EventRequest data to a new EventEntity entity.
     * 
     * Creates a new EventEntity instance with data from the request.
     * Timestamps (createdAt, updatedAt) are set by JPA lifecycle callbacks.
     * 
     * @param request the EventRequest to convert
     * @return a new EventEntity entity with the request's data
     */
    public EventEntity toEntity(EventRequest request) {
        EventEntity entity = new EventEntity();
        return mapRequestToEntity(request, entity);
    }

    /**
     * Maps EventRequest data to an existing EventEntity entity.
     * 
     * Updates an existing EventEntity with data from the request.
     * Useful for update operations where we need to merge request data
     * with existing entity that preserves its ID and timestamps.
     * 
     * @param request the EventRequest containing the new data
     * @param entity the existing EventEntity to update
     * @return the updated EventEntity entity
     */
    public EventEntity mapRequestToEntity(EventRequest request, EventEntity entity) {
        entity.setTitle(request.getTitle());
        entity.setDescription(request.getDescription());
        entity.setStartTime(request.getStartTime());
        entity.setEndTime(request.getEndTime());
        return entity;
    }
}

