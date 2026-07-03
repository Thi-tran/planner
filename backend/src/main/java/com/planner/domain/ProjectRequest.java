package com.planner.domain;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectRequest {

    @NotBlank(message = "Project name is required")
    @Size(max = 255, message = "Project name must not exceed 255 characters")
    private String name;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    private LocalDate endDate;

    @NotBlank(message = "Color is required")
    @Pattern(regexp = "^(Sky Cyan|Blush Pink|Soft Indigo|Sage Green)$",
            message = "Color must be one of: Sky Cyan, Blush Pink, Soft Indigo, Sage Green")
    private String color;

    @Pattern(regexp = "^(in progress|completed|on hold|planning)$",
            message = "Status must be one of: in progress, completed, on hold, planning")
    private String status;

    @AssertTrue(message = "End date must be after start date")
    public boolean isEndDateValid() {
        return endDate == null || startDate == null || endDate.isAfter(startDate);
    }
}
