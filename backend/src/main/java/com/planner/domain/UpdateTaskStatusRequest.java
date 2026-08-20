package com.planner.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTaskStatusRequest {
    
    @NotBlank(message = "Status is required")
    @Pattern(regexp = "^(todo|done)$", message = "Status must be either 'todo' or 'done'")
    private String status;
}
