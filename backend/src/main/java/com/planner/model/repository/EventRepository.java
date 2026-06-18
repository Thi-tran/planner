package com.planner.model;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for EventEntity.
 * 
 * Provides data access operations for EventEntity entities including:
 * - Standard CRUD operations via JpaRepository
 * - Dynamic query support via JpaSpecificationExecutor
 * - Custom query methods for common event searches
 * 
 * Uses @EntityGraph to eager-load the category association,
 * preventing N+1 queries when resolving event colors.
 */
public interface EventRepository extends JpaRepository<EventEntity, UUID>, JpaSpecificationExecutor<EventEntity> {

    /**
     * Finds all events that overlap with the given time range.
     * An event overlaps when: startTime < to AND endTime > from
     * 
     * Eagerly loads the category association to avoid N+1 queries
     * when resolving colors for multiple events.
     * 
     * @param to the exclusive end time of the range
     * @param from the inclusive start time of the range
     * @return a list of events overlapping with [from, to)
     */
    @EntityGraph(attributePaths = {"category"})
    List<EventEntity> findByStartTimeLessThanAndEndTimeGreaterThan(Instant to, Instant from);

    /**
     * Finds a single event by ID with its category eagerly loaded.
     * 
     * @param id the UUID of the event
     * @return an Optional containing the event if found
     */
    @EntityGraph(attributePaths = {"category"})
    Optional<EventEntity> findById(UUID id);
}

