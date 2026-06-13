package com.planner.dto;

import com.planner.model.Event;

import java.time.Instant;
import java.util.UUID;

public record EventResponse(
        UUID id,
        String title,
        String description,
        Instant startTime,
        Instant endTime,
        String color,
        Instant createdAt,
        Instant updatedAt
) {
    public static EventResponse from(Event e) {
        return new EventResponse(
                e.getId(),
                e.getTitle(),
                e.getDescription(),
                e.getStartTime(),
                e.getEndTime(),
                e.getColor(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}
