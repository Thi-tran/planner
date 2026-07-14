package com.planner.controller;

import com.planner.domain.CategoryRequest;
import com.planner.domain.CategoryResponse;
import com.planner.model.entity.UserEntity;
import com.planner.security.CurrentUserService;
import com.planner.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService service;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<CategoryResponse> list(
            @RequestParam(required = true) UUID projectId,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return service.listByProject(projectId, user.getId());
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(
            @RequestBody @Valid CategoryRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req, user.getId()));
    }

    @PutMapping("/{id}")
    public CategoryResponse update(
            @PathVariable UUID id,
            @RequestBody @Valid CategoryRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return service.update(id, req, user.getId());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        service.delete(id, user.getId());
        return ResponseEntity.noContent().build();
    }
}
