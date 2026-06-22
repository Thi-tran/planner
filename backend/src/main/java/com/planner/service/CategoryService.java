package com.planner.service;

import com.planner.domain.CategoryRequest;
import com.planner.domain.CategoryResponse;
import com.planner.exception.ResourceNotFoundException;
import com.planner.mapper.CategoryMapper;
import com.planner.model.CategoryRepository;
import com.planner.model.entity.CategoryEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service for managing Category operations.
 * 
 * Orchestrates business logic for category CRUD operations
 * including uniqueness validation.
 */
@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository repository;
    private final CategoryMapper mapper;

    /**
     * Returns all categories sorted alphabetically by name.
     *
     * @return list of all categories
     */
    public List<CategoryResponse> listAll() {
        return repository.findAllByOrderByNameAsc()
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    /**
     * Creates a new category.
     * 
     * @param req the category data
     * @return the created category
     * @throws IllegalArgumentException if a category with the same name already exists
     */
    @Transactional
    public CategoryResponse create(CategoryRequest req) {
        if (repository.existsByNameIgnoreCase(req.getName())) {
            throw new IllegalArgumentException("Category name already exists: " + req.getName());
        }

        CategoryEntity entity = CategoryEntity.builder()
                .name(req.getName())
                .color(req.getColor())
                .build();

        return mapper.toResponse(repository.save(entity));
    }

    /**
     * Updates an existing category's name and/or color.
     * 
     * @param id the UUID of the category to update
     * @param req the new category data
     * @return the updated category
     * @throws ResourceNotFoundException if the category does not exist
     * @throws IllegalArgumentException if another category with the same name already exists
     */
    @Transactional
    public CategoryResponse update(UUID id, CategoryRequest req) {
        CategoryEntity entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));

        if (repository.existsByNameIgnoreCaseAndIdNot(req.getName(), id)) {
            throw new IllegalArgumentException("Category name already exists: " + req.getName());
        }

        entity.setName(req.getName());
        entity.setColor(req.getColor());

        return mapper.toResponse(repository.save(entity));
    }
}
