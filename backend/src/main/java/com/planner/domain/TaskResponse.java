package com.planner.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        UUID checklistId,
        String description,
        UUID assignedTo,
        UserSummary assignedToUser,
        LocalDate deadline,
        String status,
        Integer displayOrder,
        List<TaskCommentResponse> comments,
        Instant createdAt,
        Instant updatedAt
) {
}
