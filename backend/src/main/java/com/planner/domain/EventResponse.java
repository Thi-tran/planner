package com.planner.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO for Event API responses.
 * 
 * Represents the data returned to clients when fetching or creating events.
 * Implements Java record for immutability and automatic generation of equals/hashCode/toString.
 * Contains all event information including audit timestamps (read-only).
 */
public record EventResponse(
        /**
         * Unique identifier of the event
         */
        UUID id,

        /**
         * Event title/subject
         */
        String title,

        /**
         * Event description (optional)
         */
        String description,

        /**
         * Event start time (inclusive)
         */
        Instant startTime,

        /**
         * Event end time (exclusive)
         */
        Instant endTime,

        /**
         * Category ID this event belongs to (nullable)
         */
        UUID categoryId,

        /**
         * Resolved display color: event color override > category color > default
         */
        String resolvedColor,

        /**
         * Timestamp when the event was created
         */
        Instant createdAt,

        /**
         * Timestamp when the event was last updated
         */
        Instant updatedAt
) {
}

