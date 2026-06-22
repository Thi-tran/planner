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

    /**
     * Converts a CategoryEntity to a CategoryResponse (for API responses).
     * 
     * @param entity the CategoryEntity to convert
     * @return a CategoryResponse with the entity's data
     */
    public CategoryResponse toResponse(CategoryEntity entity) {
        return new CategoryResponse(
                entity.getId(),
                entity.getName(),
                entity.getColor()
        );
    }
}
