package com.planner.model.repository;

import com.planner.model.entity.ChecklistTaskEntity;
import com.planner.model.entity.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChecklistTaskRepository extends JpaRepository<ChecklistTaskEntity, UUID> {
    
    /**
     * Count tasks by status for summary metrics.
     */
    @Query("SELECT COUNT(t) FROM ChecklistTaskEntity t WHERE t.checklist.project.id = :projectId AND t.status IN :statuses")
    long countByProjectIdAndStatusIn(@Param("projectId") UUID projectId, @Param("statuses") List<TaskStatus> statuses);
    
    /**
     * Count overdue tasks (deadline before date and not done) for summary metrics.
     */
    @Query("SELECT COUNT(t) FROM ChecklistTaskEntity t WHERE t.checklist.project.id = :projectId AND t.deadline < :date AND t.status != :status")
    long countByProjectIdAndDeadlineBeforeAndStatusNot(@Param("projectId") UUID projectId, @Param("date") LocalDate date, @Param("status") TaskStatus status);
    
    /**
     * Count all tasks for a project.
     */
    @Query("SELECT COUNT(t) FROM ChecklistTaskEntity t WHERE t.checklist.project.id = :projectId")
    long countByProjectId(@Param("projectId") UUID projectId);
    
    /**
     * Find maximum display order for checklist to calculate next task order.
     */
    @Query("SELECT MAX(t.displayOrder) FROM ChecklistTaskEntity t WHERE t.checklist.id = :checklistId")
    Integer findMaxDisplayOrder(@Param("checklistId") UUID checklistId);
    
    /**
     * Find task with assignee for proper mapping after creation.
     */
    @Query("SELECT t FROM ChecklistTaskEntity t LEFT JOIN FETCH t.assignedToUser WHERE t.id = :id")
    Optional<ChecklistTaskEntity> findByIdWithAssignee(@Param("id") UUID id);
}
