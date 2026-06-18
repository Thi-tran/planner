package com.planner.domain;

import java.util.UUID;

/**
 * DTO for Category API responses.
 * 
 * Represents the data returned to clients when fetching or creating categories.
 * Uses a Java record for immutability.
 */
public record CategoryResponse(
        /**
         * Unique identifier of the category
         */
        UUID id,

        /**
         * Category name
         */
        String name,

        /**
         * Category color in hex format (e.g., #3b82f6)
         */
        String color
) {
}
