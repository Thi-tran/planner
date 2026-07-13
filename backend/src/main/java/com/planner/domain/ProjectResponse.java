package com.planner.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ProjectResponse(
        UUID id,
        String name,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        String color,
        String status,
        Instant lastAccessedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
