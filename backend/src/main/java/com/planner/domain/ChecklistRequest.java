package com.planner.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ChecklistRequest {
    @NotBlank(message = "Checklist name is required")
    @Size(max = 255, message = "Name must not exceed 255 characters")
    private String name;

    @Size(max = 2000, message = "Description must not exceed 2000 characters")
    private String description;

    @NotBlank(message = "Color is required")
    @Size(max = 50)
    private String color;

    private LocalDate dueDate; // Optional
}
