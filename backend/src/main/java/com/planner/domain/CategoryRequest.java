package com.planner.domain;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO for creating or updating a Category.
 * 
 * Contains validation annotations to ensure data integrity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CategoryRequest {

    @NotBlank(message = "name is required")
    private String name;

    @NotBlank(message = "color is required")
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "color must be a valid hex color (e.g. #3b82f6)")
    private String color;
}
