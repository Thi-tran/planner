package com.planner.repository;

import com.planner.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface EventRepository extends JpaRepository<Event, UUID> {

    /**
     * Returns all events that overlap with [from, to).
     * An event overlaps when: startTime < to AND endTime > from
     */
    List<Event> findByStartTimeLessThanAndEndTimeGreaterThan(Instant to, Instant from);
}
