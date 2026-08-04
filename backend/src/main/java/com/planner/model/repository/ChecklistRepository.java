package com.planner.model.repository;

import com.planner.model.entity.ChecklistEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChecklistRepository extends JpaRepository<ChecklistEntity, UUID> {
    
    /**
     * Fetch checklists with tasks for list view.
     * Uses JOIN FETCH to prevent N+1 queries.
     */
    @Query("""
        SELECT DISTINCT c FROM ChecklistEntity c 
        LEFT JOIN FETCH c.tasks t
        LEFT JOIN FETCH t.assignedToUser
        WHERE c.project.id = :projectId 
        ORDER BY c.createdAt
    """)
    List<ChecklistEntity> findByProjectIdWithTasks(@Param("projectId") UUID projectId);
    
    /**
     * Fetch single checklist with all details for detail view.
     * Uses JOIN FETCH to prevent N+1 queries for tasks, users, and comments.
     */
    @Query("""
        SELECT DISTINCT c FROM ChecklistEntity c 
        LEFT JOIN FETCH c.tasks t
        LEFT JOIN FETCH t.assignedToUser
        LEFT JOIN FETCH t.comments tc
        LEFT JOIN FETCH tc.user
        WHERE c.id = :id
    """)
    Optional<ChecklistEntity> findByIdWithTasksAndComments(@Param("id") UUID id);
    
    /**
     * Count total checklists for a project.
     */
    long countByProjectId(UUID projectId);
    
    /**
     * Fetch checklist with project for authorization checks.
     */
    @Query("SELECT c FROM ChecklistEntity c JOIN FETCH c.project WHERE c.id = :id")
    Optional<ChecklistEntity> findByIdWithProject(@Param("id") UUID id);
}
