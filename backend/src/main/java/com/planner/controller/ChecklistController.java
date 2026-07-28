package com.planner.controller;

import com.planner.domain.ChecklistResponse;
import com.planner.domain.ChecklistSummaryResponse;
import com.planner.model.entity.UserEntity;
import com.planner.security.CurrentUserService;
import com.planner.service.ChecklistService;
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
}
