package com.planner.controller;

import com.planner.domain.ProjectRequest;
import com.planner.domain.ProjectResponse;
import com.planner.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "${cors.allowed-origins}")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    /**
     * Get all projects sorted by last accessed timestamp.
     *
     * @return list of projects
     */
    @GetMapping
    public ResponseEntity<List<ProjectResponse>> listProjects() {
        List<ProjectResponse> projects = projectService.listAll();
        return ResponseEntity.ok(projects);
    }

    /**
     * Get a single project by ID.
     *
     * @param id the project ID
     * @return the project response
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getProject(@PathVariable UUID id) {
        ProjectResponse project = projectService.findById(id);
        return ResponseEntity.ok(project);
    }

    /**
     * Create a new project.
     *
     * @param request the project request
     * @return the created project with 201 status and Location header
     */
    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(@Valid @RequestBody ProjectRequest request) {
        ProjectResponse created = projectService.create(request);

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    /**
     * Update an existing project.
     *
     * @param id the project ID
     * @param request the project request
     * @return the updated project
     */
    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable UUID id,
            @Valid @RequestBody ProjectRequest request) {
        ProjectResponse updated = projectService.update(id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * Delete a project (cascades to events).
     *
     * @param id the project ID
     * @return 204 No Content
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable UUID id) {
        projectService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Update the last accessed timestamp for a project.
     *
     * @param id the project ID
     * @return the updated project
     */
    @PatchMapping("/{id}/access")
    public ResponseEntity<ProjectResponse> updateProjectAccess(@PathVariable UUID id) {
        ProjectResponse updated = projectService.updateAccess(id);
        return ResponseEntity.ok(updated);
    }
}
