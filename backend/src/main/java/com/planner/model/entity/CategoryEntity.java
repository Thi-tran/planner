package com.planner.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.io.Serializable;
import java.util.UUID;

/**
 * Category entity representing an event category with a name and color.
 * 
 * Categories are simple reference data used to classify events
 * and provide a default color for display.
 */
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
@Table(name = "categories")
public class CategoryEntity implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Setter
    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Setter
    @Column(name = "color", nullable = false, length = 7)
    private String color;
}
