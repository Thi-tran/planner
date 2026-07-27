package com.planner.domain;

import java.time.Instant;
import java.util.UUID;

public record TaskCommentResponse(
        UUID id,
        UUID taskId,
        UUID userId,
        UserSummary user,
        String commentText,
        Instant createdAt,
        Instant updatedAt
) {
}
