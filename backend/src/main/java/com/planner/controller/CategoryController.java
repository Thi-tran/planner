package com.planner.controller;

import com.planner.domain.CategoryRequest;
import com.planner.domain.CategoryResponse;
import com.planner.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST API Controller for Category operations.
 * 
 * Provides endpoints for listing, creating, and updating categories.
 * All endpoints start with /api/categories.
 */
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService service;

    /**
     * Retrieves all categories sorted alphabetically by name.
     * 
     * GET /api/categories
     *
     * @return list of all categories
     */
    @GetMapping
    public List<CategoryResponse> list() {
        return service.listAll();
    }

    /**
     * Creates a new category.
     * 
     * POST /api/categories
     *
     * @param req the category data
     * @return 201 Created with the created category
     */
    @PostMapping
    public ResponseEntity<CategoryResponse> create(@RequestBody @Valid CategoryRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    /**
     * Updates an existing category.
     * 
     * PUT /api/categories/{id}
     *
     * @param id the UUID of the category to update
     * @param req the new category data
     * @return the updated category
     */
    @PutMapping("/{id}")
    public CategoryResponse update(@PathVariable UUID id, @RequestBody @Valid CategoryRequest req) {
        return service.update(id, req);
    }

    /**
     * Deletes a category by ID.
     * Events associated with this category will have their category_id set to NULL
     * automatically by the database ON DELETE SET NULL constraint.
     * 
     * DELETE /api/categories/{id}
     *
     * @param id the UUID of the category to delete
     * @return 204 No Content on success
     * @throws ResourceNotFoundException if category not found (returns 404)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
