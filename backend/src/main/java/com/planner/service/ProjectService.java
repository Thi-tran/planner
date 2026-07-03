package com.planner.service;

import com.planner.domain.ProjectRequest;
import com.planner.domain.ProjectResponse;
import com.planner.exception.ResourceNotFoundException;
import com.planner.mapper.ProjectMapper;
import com.planner.model.entity.ProjectEntity;
import com.planner.model.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMapper projectMapper;

    /**
     * Retrieves all projects sorted by last accessed timestamp.
     *
     * @return list of project responses
     */
    @Transactional(readOnly = true)
    public List<ProjectResponse> listAll() {
        return projectRepository.findAllByOrderByLastAccessedAtDescNullsLast()
                .stream()
                .map(projectMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a single project by ID.
     *
     * @param id the project ID
     * @return the project response
     * @throws ResourceNotFoundException if project not found
     */
    @Transactional(readOnly = true)
    public ProjectResponse findById(UUID id) {
        ProjectEntity project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        return projectMapper.toResponse(project);
    }

    /**
     * Creates a new project.
     *
     * @param request the project request
     * @return the created project response
     */
    @Transactional
    public ProjectResponse create(ProjectRequest request) {
        ProjectEntity project = projectMapper.toEntity(request);
        ProjectEntity savedProject = projectRepository.save(project);
        return projectMapper.toResponse(savedProject);
    }

    /**
     * Updates an existing project.
     *
     * @param id the project ID
     * @param request the project request
     * @return the updated project response
     * @throws ResourceNotFoundException if project not found
     */
    @Transactional
    public ProjectResponse update(UUID id, ProjectRequest request) {
        ProjectEntity project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));

        projectMapper.mapRequestToEntity(request, project);
        ProjectEntity updatedProject = projectRepository.save(project);
        return projectMapper.toResponse(updatedProject);
    }

    /**
     * Deletes a project and cascades to all associated events.
     * Transaction ensures rollback on failure.
     *
     * @param id the project ID
     * @throws ResourceNotFoundException if project not found
     */
    @Transactional
    public void delete(UUID id) {
        ProjectEntity project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        projectRepository.delete(project);
    }

    /**
     * Updates the last accessed timestamp for a project.
     *
     * @param id the project ID
     * @return the updated project response
     * @throws ResourceNotFoundException if project not found
     */
    @Transactional
    public ProjectResponse updateAccess(UUID id) {
        ProjectEntity project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));

        project.setLastAccessedAt(Instant.now());
        ProjectEntity updatedProject = projectRepository.save(project);
        return projectMapper.toResponse(updatedProject);
    }
}
