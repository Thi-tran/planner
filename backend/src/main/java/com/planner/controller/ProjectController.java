package com.planner.controller;

import com.planner.domain.InviteMemberRequest;
import com.planner.domain.MembershipResponse;
import com.planner.domain.ProjectRequest;
import com.planner.domain.ProjectResponse;
import com.planner.domain.UpdateMemberRoleRequest;
import com.planner.model.entity.UserEntity;
import com.planner.security.CurrentUserService;
import com.planner.service.ProjectMembershipService;
import com.planner.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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
    private final ProjectMembershipService membershipService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> listProjects(@AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return ResponseEntity.ok(projectService.listAll(user.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getProject(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return ResponseEntity.ok(projectService.findById(id, user.getId()));
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(
            @Valid @RequestBody ProjectRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        ProjectResponse created = projectService.create(request, user.getId());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable UUID id,
            @Valid @RequestBody ProjectRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return ResponseEntity.ok(projectService.update(id, request, user.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        projectService.delete(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/access")
    public ResponseEntity<ProjectResponse> updateProjectAccess(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return ResponseEntity.ok(projectService.updateAccess(id, user.getId()));
    }

    // --- Membership endpoints ---

    @GetMapping("/{id}/members")
    public ResponseEntity<List<MembershipResponse>> listMembers(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return ResponseEntity.ok(membershipService.listMembers(id, user.getId()));
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<MembershipResponse> inviteMember(
            @PathVariable UUID id,
            @Valid @RequestBody InviteMemberRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        MembershipResponse response = membershipService.inviteMember(id, user.getId(), request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{membershipId}").buildAndExpand(response.id()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PatchMapping("/{id}/members/{membershipId}")
    public ResponseEntity<MembershipResponse> updateMemberRole(
            @PathVariable UUID id,
            @PathVariable UUID membershipId,
            @Valid @RequestBody UpdateMemberRoleRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return ResponseEntity.ok(membershipService.updateMemberRole(id, membershipId, user.getId(), request));
    }

    @DeleteMapping("/{id}/members/{membershipId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID id,
            @PathVariable UUID membershipId,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        membershipService.removeMember(id, membershipId, user.getId());
        return ResponseEntity.noContent().build();
    }
}
