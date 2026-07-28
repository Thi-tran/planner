package com.planner.service;

import com.planner.domain.ChecklistResponse;
import com.planner.domain.ChecklistSummaryResponse;
import com.planner.exception.ResourceNotFoundException;
import com.planner.mapper.ChecklistMapper;
import com.planner.model.entity.ChecklistEntity;
import com.planner.model.entity.Role;
import com.planner.model.entity.TaskStatus;
import com.planner.model.repository.ChecklistRepository;
import com.planner.model.repository.ChecklistTaskRepository;
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
    private final ChecklistMapper checklistMapper;
    private final ProjectAccessService projectAccessService;
    
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
}
