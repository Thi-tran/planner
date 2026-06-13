package com.planner.model;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface EventRepository extends JpaRepository<Event, UUID>, JpaSpecificationExecutor<Event> {

    /**
     * Returns all events that overlap with [from, to).
     * An event overlaps when: startTime < to AND endTime > from
     */
    List<Event> findByStartTimeLessThanAndEndTimeGreaterThan(Instant to, Instant from);
}

