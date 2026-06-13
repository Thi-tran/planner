package com.planner.mapper;

import com.planner.model.Event;
import com.planner.domain.EventRequest;
import com.planner.domain.EventResponse;
import org.springframework.stereotype.Component;

@Component
public class EventMapper {

    /**
     * Converts an Event to EventResponse (for API responses)
     */
    public EventResponse toResponse(Event entity) {
        return new EventResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getStartTime(),
                entity.getEndTime(),
                entity.getColor(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    /**
     * Maps EventRequest data to a new Event
     */
    public Event toEntity(EventRequest request) {
        Event entity = new Event();
        return mapRequestToEntity(request, entity);
    }

    /**
     * Maps EventRequest data to an existing Event
     */
    public Event mapRequestToEntity(EventRequest request, Event entity) {
        entity.setTitle(request.getTitle());
        entity.setDescription(request.getDescription());
        entity.setStartTime(request.getStartTime());
        entity.setEndTime(request.getEndTime());
        entity.setColor(request.getColor());
        return entity;
    }
}

