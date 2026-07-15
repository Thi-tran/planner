package com.planner.service;

import com.planner.domain.InviteMemberRequest;
import com.planner.domain.MembershipResponse;
import com.planner.domain.UpdateMemberRoleRequest;
import com.planner.exception.ForbiddenException;
import com.planner.exception.ResourceNotFoundException;
import com.planner.model.entity.MembershipStatus;
import com.planner.model.entity.ProjectMembershipEntity;
import com.planner.model.entity.Role;
import com.planner.model.entity.UserEntity;
import com.planner.model.repository.ProjectMembershipRepository;
import com.planner.model.repository.UserRepository;
import com.planner.security.ProjectAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectMembershipService {

    private final ProjectMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final ProjectAccessService projectAccessService;

    @Transactional(readOnly = true)
    public List<MembershipResponse> listMembers(UUID projectId, UUID requesterId) {
        projectAccessService.requireRole(projectId, requesterId, Role.VIEWER);
        return membershipRepository.findByProjectId(projectId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public MembershipResponse inviteMember(UUID projectId, UUID requesterId, InviteMemberRequest req) {
        projectAccessService.requireRole(projectId, requesterId, Role.OWNER);

        String normalizedEmail = req.email().toLowerCase();
        Optional<UserEntity> existingUser = userRepository.findByEmailIgnoreCase(normalizedEmail);

        if (existingUser.isPresent()) {
            UUID inviteeId = existingUser.get().getId();
            membershipRepository.findByProjectIdAndUserId(projectId, inviteeId)
                    .ifPresent(m -> { throw new IllegalArgumentException("User is already a member of this project"); });

            ProjectMembershipEntity membership = ProjectMembershipEntity.builder()
                    .projectId(projectId)
                    .userId(inviteeId)
                    .role(req.role())
                    .status(MembershipStatus.ACTIVE)
                    .build();
            return toResponse(membershipRepository.save(membership));
        } else {
            membershipRepository.findByInvitedEmailIgnoreCase(normalizedEmail).stream()
                    .filter(m -> m.getProjectId().equals(projectId))
                    .findFirst()
                    .ifPresent(m -> { throw new IllegalArgumentException("Invite already pending for this email"); });

            ProjectMembershipEntity membership = ProjectMembershipEntity.builder()
                    .projectId(projectId)
                    .invitedEmail(normalizedEmail)
                    .role(req.role())
                    .status(MembershipStatus.PENDING)
                    .build();
            return toResponse(membershipRepository.save(membership));
        }
    }

    @Transactional
    public MembershipResponse updateMemberRole(UUID projectId, UUID membershipId, UUID requesterId, UpdateMemberRoleRequest req) {
        projectAccessService.requireRole(projectId, requesterId, Role.OWNER);

        ProjectMembershipEntity membership = membershipRepository.findById(membershipId)
                .filter(m -> m.getProjectId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Membership not found: " + membershipId));

        if (membership.getRole() == Role.OWNER && req.role() != Role.OWNER) {
            long ownerCount = membershipRepository.findByProjectId(projectId).stream()
                    .filter(m -> m.getRole() == Role.OWNER && m.getStatus() == MembershipStatus.ACTIVE)
                    .count();
            if (ownerCount <= 1) {
                throw new ForbiddenException("Cannot demote the last owner of the project");
            }
        }

        membership.setRole(req.role());
        return toResponse(membershipRepository.save(membership));
    }

    @Transactional
    public void removeMember(UUID projectId, UUID membershipId, UUID requesterId) {
        projectAccessService.requireRole(projectId, requesterId, Role.OWNER);

        ProjectMembershipEntity membership = membershipRepository.findById(membershipId)
                .filter(m -> m.getProjectId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Membership not found: " + membershipId));

        if (membership.getRole() == Role.OWNER) {
            long ownerCount = membershipRepository.findByProjectId(projectId).stream()
                    .filter(m -> m.getRole() == Role.OWNER && m.getStatus() == MembershipStatus.ACTIVE)
                    .count();
            if (ownerCount <= 1) {
                throw new ForbiddenException("Cannot remove the last owner of the project");
            }
        }

        membershipRepository.delete(membership);
    }

    private MembershipResponse toResponse(ProjectMembershipEntity membership) {
        String email = membership.getInvitedEmail();
        String displayName = null;
        if (membership.getUserId() != null) {
            Optional<UserEntity> user = userRepository.findById(membership.getUserId());
            if (user.isPresent()) {
                email = user.get().getEmail();
                displayName = user.get().getDisplayName();
            }
        }
        return new MembershipResponse(
                membership.getId(),
                membership.getUserId(),
                email,
                displayName,
                membership.getRole(),
                membership.getStatus()
        );
    }
}
