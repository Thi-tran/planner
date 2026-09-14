package com.planner.service;

import com.planner.domain.ChecklistRequest;
import com.planner.domain.ChecklistResponse;
import com.planner.domain.ChecklistSummaryResponse;
import com.planner.domain.CommentRequest;
import com.planner.domain.TaskCommentResponse;
import com.planner.domain.TaskRequest;
import com.planner.domain.TaskResponse;
import com.planner.domain.UpdateTaskRequest;
import com.planner.exception.BadRequestException;
import com.planner.exception.ResourceNotFoundException;
import com.planner.mapper.ChecklistMapper;
import com.planner.model.entity.*;
import com.planner.model.repository.*;
import com.planner.security.ProjectAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChecklistService {
    
    private final ChecklistRepository checklistRepository;
    private final ChecklistTaskRepository checklistTaskRepository;
    private final TaskCommentRepository taskCommentRepository;
    private final ChecklistMapper checklistMapper;
    private final ProjectAccessService projectAccessService;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectMembershipRepository membershipRepository;
    
    @Transactional(readOnly = true)
    public List<ChecklistResponse> listByProject(UUID projectId, UUID userId) {
        // Verify user has access to project
        projectAccessService.requireRole(projectId, userId, Role.VIEWER);
        
        List<ChecklistEntity> checklists = checklistRepository.findByProjectIdWithTasks(projectId);
        return checklists.stream()
                .map(checklistMapper::toResponse)
                .toList();
    }
    
    @Transactional(readOnly = true)
    public ChecklistResponse findById(UUID checklistId, UUID userId) {
        ChecklistEntity checklist = checklistRepository.findByIdWithTasksAndComments(checklistId)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist not found with id: " + checklistId));
        
        // Verify user has access to the project containing this checklist
        projectAccessService.requireRole(checklist.getProject().getId(), userId, Role.VIEWER);
        
        return checklistMapper.toResponse(checklist);
    }
    
    @Transactional(readOnly = true)
    public ChecklistSummaryResponse getSummary(UUID projectId, UUID userId) {
        // Verify user has access to project
        projectAccessService.requireRole(projectId, userId, Role.VIEWER);
        
        long totalChecklists = checklistRepository.countByProjectId(projectId);
        long totalTasks = checklistTaskRepository.countByProjectId(projectId);
        long completedTasks = checklistTaskRepository.countByProjectIdAndStatusIn(
                projectId, List.of(TaskStatus.DONE));
        long overdueTasks = checklistTaskRepository.countByProjectIdAndDeadlineBeforeAndStatusNot(
                projectId, LocalDate.now(), TaskStatus.DONE);
        
        return new ChecklistSummaryResponse(
                (int) totalChecklists,
                (int) totalTasks,
                (int) completedTasks,
                (int) overdueTasks
        );
    }
    
    @Transactional
    public ChecklistResponse create(UUID projectId, ChecklistRequest request, UUID userId) {
        // Validate project access
        projectAccessService.requireRole(projectId, userId, Role.VIEWER);
        
        // Load project
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        
        // Create checklist entity
        ChecklistEntity checklist = new ChecklistEntity();
        checklist.setProject(project);
        checklist.setName(request.getName());
        checklist.setDescription(request.getDescription());
        checklist.setColor(request.getColor());
        checklist.setDueDate(request.getDueDate());
        
        // Save and return
        ChecklistEntity saved = checklistRepository.save(checklist);
        return checklistMapper.toResponse(saved);
    }
    
    @Transactional
    public TaskResponse addTask(UUID checklistId, TaskRequest request, UUID userId) {
        // Load checklist with project
        ChecklistEntity checklist = checklistRepository.findByIdWithProject(checklistId)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist not found"));
        
        // Validate project access
        projectAccessService.requireRole(checklist.getProject().getId(), userId, Role.VIEWER);
        
        // If assignedTo provided, validate they're a project member
        if (request.getAssignedTo() != null) {
            membershipRepository.findByProjectIdAndUserId(
                    checklist.getProject().getId(),
                    request.getAssignedTo()
            ).orElseThrow(() -> new BadRequestException("Assigned user is not a project member"));
        }
        
        // Calculate display_order
        Integer maxOrder = checklistTaskRepository.findMaxDisplayOrder(checklistId);
        int displayOrder = (maxOrder != null) ? maxOrder + 1 : 0;
        
        // Create task entity
        ChecklistTaskEntity task = new ChecklistTaskEntity();
        task.setChecklist(checklist);
        task.setTitle(request.getTitle());
        task.setDetails(request.getDetails());
        if (request.getAssignedTo() != null) {
            UserEntity assignee = userRepository.findById(request.getAssignedTo())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            task.setAssignedToUser(assignee);
        }
        task.setDeadline(request.getDeadline());
        task.setPriority(request.getPriority() != null ? request.getPriority() : "medium");
        task.setStatus(TaskStatus.TODO);
        task.setDisplayOrder(displayOrder);
        
        // Save and return
        ChecklistTaskEntity saved = checklistTaskRepository.save(task);
        
        // Reload with associations for proper mapping
        saved = checklistTaskRepository.findByIdWithAssignee(saved.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found after creation"));
        
        return checklistMapper.toTaskResponse(saved);
    }
    
    @Transactional
    public TaskResponse updateTaskStatus(UUID taskId, String statusString, UUID userId) {
        // Load task with checklist and project
        ChecklistTaskEntity task = checklistTaskRepository.findByIdWithChecklist(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
        
        // Validate project access
        UUID projectId = task.getChecklist().getProject().getId();
        projectAccessService.requireRole(projectId, userId, Role.VIEWER);
        
        // Convert status string to enum
        TaskStatus newStatus = TaskStatus.fromDbValue(statusString);
        
        // Update status
        task.setStatus(newStatus);
        ChecklistTaskEntity saved = checklistTaskRepository.save(task);
        
        // Reload with assignee for proper mapping
        saved = checklistTaskRepository.findByIdWithAssignee(saved.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found after update"));
        
        return checklistMapper.toTaskResponse(saved);
    }
    
    /**
     * Get single task with full details (including comments).
     * Requires VIEWER role on the task's project.
     */
    @Transactional(readOnly = true)
    public TaskResponse getTaskDetails(UUID taskId, UUID userId) {
        ChecklistTaskEntity task = checklistTaskRepository.findByIdWithDetails(taskId)
            .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        
        UUID projectId = task.getChecklist().getProject().getId();
        
        // Authorization: require VIEWER
        projectAccessService.requireRole(projectId, userId, Role.VIEWER);
        
        return checklistMapper.toTaskResponse(task);
    }
    
    /**
     * Update task information.
     * Requires EDITOR role on the task's project.
     */
    @Transactional
    public TaskResponse updateTask(UUID taskId, UpdateTaskRequest request, UUID userId) {
        ChecklistTaskEntity task = checklistTaskRepository.findByIdWithDetails(taskId)
            .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        
        UUID projectId = task.getChecklist().getProject().getId();
        
        // Authorization: require EDITOR
        projectAccessService.requireRole(projectId, userId, Role.EDITOR);
        
        // Update fields
        task.setTitle(request.getTitle());
        task.setDetails(request.getDetails() != null ? request.getDetails() : "");
        task.setDeadline(request.getDeadline());
        
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        
        // Update status if changed
        if (request.getStatus() != null) {
            task.setStatus(TaskStatus.fromDbValue(request.getStatus()));
        }
        
        // Update assignee if changed
        if (request.getAssignedTo() != null) {
            // Validate assignee is project member
            UserEntity assignee = userRepository.findById(request.getAssignedTo())
                .orElseThrow(() -> new BadRequestException("Assigned user not found"));
            
            membershipRepository.findByProjectIdAndUserId(projectId, request.getAssignedTo())
                .orElseThrow(() -> new BadRequestException("Assigned user is not a project member"));
            
            task.setAssignedToUser(assignee);
        } else {
            task.setAssignedToUser(null); // Unassign
        }
        
        checklistTaskRepository.save(task);
        
        return checklistMapper.toTaskResponse(task);
    }
    
    /**
     * Delete task.
     * Requires EDITOR role on the task's project.
     */
    @Transactional
    public void deleteTask(UUID taskId, UUID userId) {
        ChecklistTaskEntity task = checklistTaskRepository.findByIdWithDetails(taskId)
            .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        
        UUID projectId = task.getChecklist().getProject().getId();
        
        // Authorization: require EDITOR
        projectAccessService.requireRole(projectId, userId, Role.EDITOR);
        
        checklistTaskRepository.delete(task);
        // Comments are cascade-deleted via orphanRemoval
    }
    
    /**
     * Add comment to task.
     * Requires VIEWER role (anyone who can see the task can comment).
     */
    @Transactional
    public TaskCommentResponse addComment(UUID taskId, CommentRequest request, UUID userId) {
        ChecklistTaskEntity task = checklistTaskRepository.findByIdWithDetails(taskId)
            .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        
        UUID projectId = task.getChecklist().getProject().getId();
        
        // Authorization: require VIEWER (can comment if can view)
        projectAccessService.requireRole(projectId, userId, Role.VIEWER);
        
        UserEntity user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        TaskCommentEntity comment = TaskCommentEntity.builder()
            .task(task)
            .user(user)
            .commentText(request.getCommentText())
            .build();
        
        task.getComments().add(comment);
        checklistTaskRepository.save(task);
        
        return checklistMapper.toCommentResponse(comment);
    }
}
