package com.planner.domain;

import java.util.UUID;

/**
 * DTO for Category API responses.
 * 
 * Represents the data returned to clients when fetching or creating categories.
 * Uses a Java record for immutability.
 */
public record CategoryResponse(
        UUID id,
        String name,
        String color,
        UUID projectId
) {
}
