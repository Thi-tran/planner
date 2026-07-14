package com.planner.mapper;

import com.planner.domain.CategoryResponse;
import com.planner.model.entity.CategoryEntity;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting between CategoryEntity and CategoryResponse.
 * 
 * Provides conversion logic between the JPA entity layer and the API DTO layer.
 */
@Component
public class CategoryMapper {

    public CategoryResponse toResponse(CategoryEntity entity) {
        return new CategoryResponse(
                entity.getId(),
                entity.getName(),
                entity.getColor(),
                entity.getProjectId()
        );
    }
}
