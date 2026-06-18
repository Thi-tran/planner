package com.planner.domain;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO for creating or updating an Event.
 * 
 * Contains validation annotations to ensure data integrity.
 * All fields are validated at the API boundary before reaching the service layer.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EventRequest {

    @NotBlank(message = "title is required")
    private String title;

    private String description;

    @NotNull(message = "startTime is required")
    private Instant startTime;

    @NotNull(message = "endTime is required")
    private Instant endTime;

    private UUID categoryId;

    /**
     * Validates that the end time is after the start time.
     * This custom validation method is called after field validations.
     * 
     * @return true if endTime is after startTime, or if either is null
     */
    @AssertTrue(message = "endTime must be after startTime")
    public boolean isEndTimeAfterStartTime() {
        if (startTime == null || endTime == null) return true;
        return endTime.isAfter(startTime);
    }
}

