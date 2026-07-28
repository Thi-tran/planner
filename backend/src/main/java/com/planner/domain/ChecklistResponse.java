package com.planner.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ChecklistResponse(
        UUID id,
        UUID projectId,
        String name,
        String description,
        String color,
        List<TaskResponse> tasks,
        Instant createdAt,
        Instant updatedAt
) {
}
