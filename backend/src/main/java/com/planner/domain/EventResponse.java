package com.planner.domain;

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
}

