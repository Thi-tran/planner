package com.planner.service;

import com.planner.domain.ProjectProgressResponse;
import com.planner.domain.ProjectRequest;
import com.planner.domain.ProjectResponse;
import com.planner.exception.ResourceNotFoundException;
import com.planner.mapper.ProjectMapper;
import com.planner.model.entity.MembershipStatus;
import com.planner.model.entity.ProjectEntity;
import com.planner.model.entity.ProjectMembershipEntity;
import com.planner.model.entity.Role;
import com.planner.model.entity.TaskStatus;
import com.planner.model.repository.ChecklistTaskRepository;
import com.planner.model.repository.ProjectMembershipRepository;
import com.planner.model.repository.ProjectRepository;
import com.planner.security.ProjectAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMapper projectMapper;
    private final ProjectMembershipRepository membershipRepository;
    private final ProjectAccessService projectAccessService;
    private final ChecklistTaskRepository checklistTaskRepository;

    @Transactional(readOnly = true)
    public List<ProjectResponse> listAll(UUID userId) {
        List<Object[]> rows = membershipRepository.findProjectIdAndRoleByUserIdAndStatus(userId, MembershipStatus.ACTIVE);
        if (rows.isEmpty()) return List.of();

        Map<UUID, Role> roleByProjectId = rows.stream()
                .collect(Collectors.toMap(r -> (UUID) r[0], r -> (Role) r[1]));

        List<UUID> projectIds = new ArrayList<>(roleByProjectId.keySet());
        return projectRepository.findAllById(projectIds).stream()
                .sorted((a, b) -> {
                    Instant ia = a.getLastAccessedAt();
                    Instant ib = b.getLastAccessedAt();
                    if (ia == null && ib == null) return 0;
                    if (ia == null) return 1;
                    if (ib == null) return -1;
                    return ib.compareTo(ia);
                })
                .map(p -> projectMapper.toResponse(p, roleByProjectId.get(p.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse findById(UUID id, UUID userId) {
        projectAccessService.requireRole(id, userId, Role.VIEWER);
        ProjectEntity project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        Role role = membershipRepository.findByProjectIdAndUserId(id, userId)
                .map(ProjectMembershipEntity::getRole)
                .orElse(null);
        return projectMapper.toResponse(project, role);
    }

    @Transactional
    public ProjectResponse create(ProjectRequest request, UUID userId) {
        ProjectEntity project = projectMapper.toEntity(request);
        ProjectEntity saved = projectRepository.save(project);

        ProjectMembershipEntity membership = ProjectMembershipEntity.builder()
                .projectId(saved.getId())
                .userId(userId)
                .role(Role.OWNER)
                .status(MembershipStatus.ACTIVE)
                .build();
        membershipRepository.save(membership);

        return projectMapper.toResponse(saved, Role.OWNER);
    }

    @Transactional
    public ProjectResponse update(UUID id, ProjectRequest request, UUID userId) {
        projectAccessService.requireRole(id, userId, Role.OWNER);
        ProjectEntity project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        projectMapper.mapRequestToEntity(request, project);
        return projectMapper.toResponse(projectRepository.save(project), Role.OWNER);
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        projectAccessService.requireRole(id, userId, Role.OWNER);
        ProjectEntity project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        projectRepository.delete(project);
    }

    @Transactional
    public ProjectResponse updateAccess(UUID id, UUID userId) {
        projectAccessService.requireRole(id, userId, Role.VIEWER);
        ProjectEntity project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        project.setLastAccessedAt(Instant.now());
        Role role = membershipRepository.findByProjectIdAndUserId(id, userId)
                .map(ProjectMembershipEntity::getRole)
                .orElse(null);
        return projectMapper.toResponse(projectRepository.save(project), role);
    }

    @Transactional(readOnly = true)
    public ProjectProgressResponse getProgress(UUID id, UUID userId) {
        projectAccessService.requireRole(id, userId, Role.VIEWER);
        
        long totalTasks = checklistTaskRepository.countByProjectId(id);
        long completedTasks = checklistTaskRepository.countByProjectIdAndStatusIn(id, List.of(TaskStatus.DONE));
        
        int percentage = totalTasks > 0 ? (int) Math.round((completedTasks * 100.0) / totalTasks) : 0;
        int tasksLeft = (int) (totalTasks - completedTasks);
        
        return new ProjectProgressResponse(
                (int) totalTasks,
                (int) completedTasks,
                percentage,
                tasksLeft
        );
    }
}
