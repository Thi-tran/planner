package com.planner.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ChecklistResponse(
        UUID id,
        UUID projectId,
        String name,
        String description,
        String color,
        LocalDate dueDate,
        List<TaskResponse> tasks,
        Instant createdAt,
        Instant updatedAt
) {
}
