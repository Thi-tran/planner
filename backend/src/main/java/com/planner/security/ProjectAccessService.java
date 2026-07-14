package com.planner.security;

import com.planner.exception.ForbiddenException;
import com.planner.exception.ResourceNotFoundException;
import com.planner.model.entity.ProjectMembershipEntity;
import com.planner.model.entity.Role;
import com.planner.model.repository.ProjectMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectAccessService {

    private final ProjectMembershipRepository membershipRepository;

    public void requireRole(UUID projectId, UUID userId, Role minRole) {
        ProjectMembershipEntity membership = membershipRepository
                .findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));

        if (!membership.getRole().atLeast(minRole)) {
            throw new ForbiddenException("Insufficient role for this operation");
        }
    }

    public Optional<ProjectMembershipEntity> getMembership(UUID projectId, UUID userId) {
        return membershipRepository.findByProjectIdAndUserId(projectId, userId);
    }
}
