package com.planner.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CommentRequest {
    @NotBlank(message = "Comment text is required")
    @Size(max = 2000, message = "Comment must be at most 2000 characters")
    private String commentText;
}
