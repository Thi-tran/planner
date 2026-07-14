package com.planner.service;

import com.planner.domain.CategoryRequest;
import com.planner.domain.CategoryResponse;
import com.planner.exception.ResourceNotFoundException;
import com.planner.mapper.CategoryMapper;
import com.planner.model.CategoryRepository;
import com.planner.model.entity.CategoryEntity;
import com.planner.model.entity.Role;
import com.planner.security.ProjectAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository repository;
    private final CategoryMapper mapper;
    private final ProjectAccessService projectAccessService;

    public List<CategoryResponse> listByProject(UUID projectId, UUID userId) {
        projectAccessService.requireRole(projectId, userId, Role.VIEWER);
        return repository.findByProjectIdOrderByNameAsc(projectId)
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional
    public CategoryResponse create(CategoryRequest req, UUID userId) {
        UUID projectId = req.getProjectId();
        projectAccessService.requireRole(projectId, userId, Role.EDITOR);

        if (repository.existsByProjectIdAndNameIgnoreCase(projectId, req.getName())) {
            throw new IllegalArgumentException("Category name already exists: " + req.getName());
        }

        CategoryEntity entity = CategoryEntity.builder()
                .name(req.getName())
                .color(req.getColor())
                .projectId(projectId)
                .build();

        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public CategoryResponse update(UUID id, CategoryRequest req, UUID userId) {
        CategoryEntity entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));

        UUID projectId = entity.getProjectId();
        projectAccessService.requireRole(projectId, userId, Role.EDITOR);

        if (repository.existsByProjectIdAndNameIgnoreCaseAndIdNot(projectId, req.getName(), id)) {
            throw new IllegalArgumentException("Category name already exists: " + req.getName());
        }

        entity.setName(req.getName());
        entity.setColor(req.getColor());

        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        CategoryEntity entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));

        projectAccessService.requireRole(entity.getProjectId(), userId, Role.EDITOR);
        repository.deleteById(id);
    }
}
