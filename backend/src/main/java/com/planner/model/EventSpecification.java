package com.planner.model;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;

public class EventSpecification {

    private EventSpecification() {
    }

    /**
     * Specification for finding events that overlap with a time range [from, to).
     * An event overlaps when: startTime < to AND endTime > from
     */
    public static Specification<Event> overlapsRange(Instant from, Instant to) {
        return (root, query, cb) -> {
            Predicate startTimeCondition = cb.lessThan(root.get("startTime"), to);
            Predicate endTimeCondition = cb.greaterThan(root.get("endTime"), from);
            return cb.and(startTimeCondition, endTimeCondition);
        };
    }

    /**
     * Specification for finding events by title (case-insensitive)
     */
    public static Specification<Event> titleContains(String title) {
        return (root, query, cb) -> cb.like(
                cb.lower(root.get("title")),
                "%" + title.toLowerCase() + "%"
        );
    }

    /**
     * Specification for finding events by color
     */
    public static Specification<Event> colorEquals(String color) {
        return (root, query, cb) -> cb.equal(root.get("color"), color);
    }
}

