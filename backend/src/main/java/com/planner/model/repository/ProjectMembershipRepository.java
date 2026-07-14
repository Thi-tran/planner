package com.planner.model.repository;

import com.planner.model.entity.MembershipStatus;
import com.planner.model.entity.ProjectMembershipEntity;
import com.planner.model.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectMembershipRepository extends JpaRepository<ProjectMembershipEntity, UUID> {

    Optional<ProjectMembershipEntity> findByProjectIdAndUserId(UUID projectId, UUID userId);

    List<ProjectMembershipEntity> findByUserId(UUID userId);

    List<ProjectMembershipEntity> findByProjectId(UUID projectId);

    List<ProjectMembershipEntity> findByInvitedEmailIgnoreCase(String invitedEmail);

    boolean existsByProjectIdAndRole(UUID projectId, Role role);

    @Query("""
            SELECT m.projectId, m.role
            FROM ProjectMembershipEntity m
            WHERE m.userId = :userId AND m.status = :status
            """)
    List<Object[]> findProjectIdAndRoleByUserIdAndStatus(
            @Param("userId") UUID userId,
            @Param("status") MembershipStatus status);
}
