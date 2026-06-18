package com.planner.model;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;

/**
 * JPA Specifications for dynamic EventEntity queries.
 * 
 * Provides reusable query predicates for filtering events based on various criteria.
 * Specifications can be combined using Specification.where() and .and() / .or() methods.
 */
public class EventSpecification {

    private EventSpecification() {
    }

    /**
     * Specification for finding events that overlap with a time range [from, to).
     * An event overlaps when: startTime < to AND endTime > from
     * 
     * @param from the start of the time range (inclusive)
     * @param to the end of the time range (exclusive)
     * @return a Specification for overlapping events
     */
    public static Specification<EventEntity> overlapsRange(Instant from, Instant to) {
        return (root, query, cb) -> {
            Predicate startTimeCondition = cb.lessThan(root.get("startTime"), to);
            Predicate endTimeCondition = cb.greaterThan(root.get("endTime"), from);
            return cb.and(startTimeCondition, endTimeCondition);
        };
    }

    /**
     * Specification for finding events by title (case-insensitive partial match).
     * 
     * @param title the title text to search for (case-insensitive)
     * @return a Specification for events matching the title
     */
    public static Specification<EventEntity> titleContains(String title) {
        return (root, query, cb) -> cb.like(
                cb.lower(root.get("title")),
                "%" + title.toLowerCase() + "%"
        );
    }

    /**
     * Specification for finding events by exact color match.
     * 
     * @param color the color value (hex format, e.g., "#3b82f6")
     * @return a Specification for events matching the color
     */
    public static Specification<EventEntity> colorEquals(String color) {
        return (root, query, cb) -> cb.equal(root.get("color"), color);
    }

    /**
     * Specification for finding events created after a specific date.
     * 
     * @param fromDate the date to filter from (inclusive)
     * @return a Specification for recently created events
     */
    public static Specification<EventEntity> createdAfter(Instant fromDate) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate);
    }

    /**
     * Specification for finding events updated after a specific date.
     * 
     * @param fromDate the date to filter from (inclusive)
     * @return a Specification for recently updated events
     */
    public static Specification<EventEntity> updatedAfter(Instant fromDate) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("updatedAt"), fromDate);
    }
}

