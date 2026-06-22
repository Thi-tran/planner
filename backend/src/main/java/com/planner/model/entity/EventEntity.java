package com.planner.model;

import com.planner.model.entity.CategoryEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Event entity representing a calendar event.
 * 
 * Manages event information including title, description, time range, and color.
 * Automatically tracks creation and update timestamps.
 */
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "events", indexes = {
        @Index(columnList = "start_time", name = "idx__events__start_time"),
        @Index(columnList = "end_time", name = "idx__events__end_time")
})
public class EventEntity implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Setter
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Setter
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Setter
    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Setter
    @Column(name = "end_time", nullable = false)
    private Instant endTime;

    @Setter
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private CategoryEntity category;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Called before entity is persisted to the database.
     * Sets the creation and update timestamps to the current time.
     */
    @PrePersist
    protected void onCreateOrUpdate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    /**
     * Called before entity is updated.
     * Updates the modification timestamp to the current time.
     */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    /**
     * Checks if this event overlaps with the given time range.
     * An event overlaps when: startTime < rangeEnd AND endTime > rangeStart
     * 
     * @param rangeStart the start of the time range to check
     * @param rangeEnd the end of the time range to check
     * @return true if the event overlaps with [rangeStart, rangeEnd), false otherwise
     */
    public boolean overlaps(Instant rangeStart, Instant rangeEnd) {
        return this.startTime.isBefore(rangeEnd) && this.endTime.isAfter(rangeStart);
    }

    /**
     * Gets a formatted duration of the event.
     * 
     * @return the duration between startTime and endTime
     */
    public long getDurationMinutes() {
        return (endTime.toEpochMilli() - startTime.toEpochMilli()) / 60_000;
    }

    /**
     * Resolves the display color for this event.
     * Uses the category color if available, otherwise falls back to default blue.
     * 
     * @return the resolved hex color string
     */
    public String resolvedColor() {
        if (this.category != null) return this.category.getColor();
        return "#3b82f6";
    }

    @Override
    public String toString() {
        return "EventEntity{" +
                "id=" + id +
                ", title='" + title + '\'' +
                ", description='" + description + '\'' +
                ", startTime=" + startTime +
                ", endTime=" + endTime +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}

