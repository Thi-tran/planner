package com.planner.controller;

import com.planner.domain.ChecklistRequest;
import com.planner.domain.ChecklistResponse;
import com.planner.domain.ChecklistSummaryResponse;
import com.planner.domain.TaskRequest;
import com.planner.domain.TaskResponse;
import com.planner.domain.UpdateTaskStatusRequest;
import com.planner.model.entity.UserEntity;
import com.planner.security.CurrentUserService;
import com.planner.service.ChecklistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "${cors.allowed-origins}")
@RequiredArgsConstructor
public class ChecklistController {
    
    private final ChecklistService checklistService;
    private final CurrentUserService currentUserService;
    
    @GetMapping("/projects/{projectId}/checklists")
    public ResponseEntity<List<ChecklistResponse>> listChecklists(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return ResponseEntity.ok(checklistService.listByProject(projectId, user.getId()));
    }
    
    @GetMapping("/checklists/{checklistId}")
    public ResponseEntity<ChecklistResponse> getChecklist(
            @PathVariable UUID checklistId,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return ResponseEntity.ok(checklistService.findById(checklistId, user.getId()));
    }
    
    @GetMapping("/projects/{projectId}/checklists/summary")
    public ResponseEntity<ChecklistSummaryResponse> getChecklistSummary(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return ResponseEntity.ok(checklistService.getSummary(projectId, user.getId()));
    }
    
    @PostMapping("/projects/{projectId}/checklists")
    public ResponseEntity<ChecklistResponse> createChecklist(
            @PathVariable UUID projectId,
            @Valid @RequestBody ChecklistRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        ChecklistResponse response = checklistService.create(projectId, request, user.getId());
        return ResponseEntity.status(201).body(response);
    }
    
    @PostMapping("/checklists/{checklistId}/tasks")
    public ResponseEntity<TaskResponse> addTask(
            @PathVariable UUID checklistId,
            @Valid @RequestBody TaskRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        TaskResponse task = checklistService.addTask(checklistId, request, user.getId());
        return ResponseEntity.status(201).body(task);
    }
    
    @PatchMapping("/checklists/tasks/{taskId}/status")
    public ResponseEntity<TaskResponse> updateTaskStatus(
            @PathVariable UUID taskId,
            @Valid @RequestBody UpdateTaskStatusRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        TaskResponse task = checklistService.updateTaskStatus(taskId, request.getStatus(), user.getId());
        return ResponseEntity.ok(task);
    }
}
