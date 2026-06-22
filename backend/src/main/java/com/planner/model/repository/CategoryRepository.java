package com.planner.model;

import com.planner.model.entity.CategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for CategoryEntity.
 * 
 * Provides data access operations for categories including
 * standard CRUD and custom query methods for uniqueness checks.
 */
public interface CategoryRepository extends JpaRepository<CategoryEntity, UUID> {

    /**
     * Checks if a category with the given name already exists (case-insensitive).
     * Used during category creation to prevent duplicates.
     *
     * @param name the category name to check
     * @return true if a category with that name exists
     */
    boolean existsByNameIgnoreCase(String name);

    /**
     * Checks if a category with the given name exists, excluding a specific category.
     * Used during category update to allow keeping the same name while preventing
     * conflicts with other categories.
     *
     * @param name the category name to check
     * @param id the UUID of the category to exclude from the check
     * @return true if another category with that name exists
     */
    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    /**
     * Returns all categories sorted alphabetically by name.
     *
     * @return sorted list of all categories
     */
    List<CategoryEntity> findAllByOrderByNameAsc();
}
