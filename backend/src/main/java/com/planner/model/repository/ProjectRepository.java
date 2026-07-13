package com.planner.model.repository;

import com.planner.model.entity.ProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<ProjectEntity, UUID> {

    /**
     * Find all projects ordered by last accessed timestamp in descending order.
     * Projects that have never been accessed (null lastAccessedAt) appear at the end.
     *
     * @return list of all projects sorted by most recently accessed first
     */
    @Query("SELECT p FROM ProjectEntity p ORDER BY p.lastAccessedAt DESC NULLS LAST")
    List<ProjectEntity> findAllByOrderByLastAccessedAtDescNullsLast();
}
