package com.planner.service;

import com.planner.domain.EventRequest;
import com.planner.domain.EventResponse;
import com.planner.exception.ResourceNotFoundException;
import com.planner.mapper.EventMapper;
import com.planner.model.CategoryRepository;
import com.planner.model.EventEntity;
import com.planner.model.EventRepository;
import com.planner.model.entity.CategoryEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Service for managing EventEntity operations.
 * 
 * Orchestrates business logic for event CRUD operations,
 * handles queries, and manages transactional integrity.
 */
@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository repository;
    private final CategoryRepository categoryRepository;
    private final EventMapper mapper;

    /**
     * Finds all events within a specified time range.
     * 
     * If no date range is provided, defaults to 7 days from today.
     * Returns all events that overlap with [from, to).
     * 
     * @param from the start of the time range (defaults to today if null)
     * @param to the end of the time range (defaults to 7 days from 'from' if null)
     * @return a list of EventResponse objects for events in the range
     */
    public List<EventResponse> findEvents(Instant from, Instant to) {
        if (from == null) from = Instant.now().truncatedTo(ChronoUnit.DAYS);
        if (to == null)   to = from.plus(7, ChronoUnit.DAYS);
        return repository.findByStartTimeLessThanAndEndTimeGreaterThan(to, from)
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    /**
     * Finds a single event by its ID.
     * 
     * @param id the UUID of the event to find
     * @return the EventResponse with the matching ID
     * @throws ResourceNotFoundException if the event does not exist
     */
    public EventResponse findById(UUID id) {
        return mapper.toResponse(getOrThrow(id));
    }

    /**
     * Creates a new event from the provided request data.
     * 
     * Converts the EventRequest to an EventEntity, persists it,
     * and returns the created event as an EventResponse.
     * Timestamps are automatically set by JPA lifecycle callbacks.
     * 
     * @param req the EventRequest containing the event data
     * @return the created EventResponse with generated ID and timestamps
     */
    @Transactional
    public EventResponse create(EventRequest req) {
        EventEntity event = mapper.toEntity(req);
        resolveCategory(req, event);
        return mapper.toResponse(repository.save(event));
    }

    /**
     * Updates an existing event with the provided request data.
     * 
     * Fetches the event by ID, updates its fields from the request,
     * persists the changes, and returns the updated event.
     * The updatedAt timestamp is automatically updated by JPA.
     * 
     * @param id the UUID of the event to update
     * @param req the EventRequest containing the new event data
     * @return the updated EventResponse
     * @throws ResourceNotFoundException if the event does not exist
     */
    @Transactional
    public EventResponse update(UUID id, EventRequest req) {
        EventEntity event = getOrThrow(id);
        mapper.mapRequestToEntity(req, event);
        resolveCategory(req, event);
        return mapper.toResponse(repository.save(event));
    }

    /**
     * Deletes an event by its ID.
     * 
     * Verifies the event exists before deletion.
     * 
     * @param id the UUID of the event to delete
     * @throws ResourceNotFoundException if the event does not exist
     */
    @Transactional
    public void delete(UUID id) {
        getOrThrow(id);
        repository.deleteById(id);
    }

    /**
     * Resolves and sets the category on an event entity based on the request's categoryId.
     * If categoryId is non-null, finds and attaches the category.
     * If categoryId is null, clears the category association.
     *
     * @param req the event request containing the categoryId
     * @param event the event entity to update
     * @throws ResourceNotFoundException if the categoryId is non-null but not found
     */
    private void resolveCategory(EventRequest req, EventEntity event) {
        if (req.getCategoryId() != null) {
            CategoryEntity cat = categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + req.getCategoryId()));
            event.setCategory(cat);
        } else {
            event.setCategory(null);
        }
    }

    /**
     * Finds an event by ID or throws ResourceNotFoundException.
     * 
     * Helper method used internally to ensure event existence
     * before performing operations.
     * 
     * @param id the UUID of the event to find
     * @return the EventEntity if found
     * @throws ResourceNotFoundException if the event does not exist
     */
    private EventEntity getOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
    }
}
