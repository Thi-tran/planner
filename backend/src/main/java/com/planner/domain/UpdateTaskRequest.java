package com.planner.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class UpdateTaskRequest {
    @NotBlank(message = "Title is required")
    @Size(max = 500, message = "Title must be at most 500 characters")
    private String title;
    
    @Size(max = 2000, message = "Details must be at most 2000 characters")
    private String details;
    
    private UUID assignedTo; // UUID or null
    
    private LocalDate deadline; // ISO date or null
    
    @Pattern(regexp = "^(low|medium|high)$", message = "Priority must be low, medium, or high")
    private String priority; // "low" | "medium" | "high"
    
    private String status; // "todo" | "done"
}
