package com.planner.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class TaskRequest {
    @NotBlank(message = "Task title is required")
    @Size(max = 500, message = "Title must not exceed 500 characters")
    private String title;

    @Size(max = 2000, message = "Details must not exceed 2000 characters")
    private String details;

    private UUID assignedTo; // Optional, must be project member

    private LocalDate deadline; // Optional

    private String priority; // "low", "medium", "high" - defaults to "medium"
}
