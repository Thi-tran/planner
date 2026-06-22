package com.planner.controller;

import com.planner.domain.EventRequest;
import com.planner.domain.EventResponse;
import com.planner.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * REST API Controller for Event operations.
 * 
 * Provides endpoints for CRUD operations on events.
 * All endpoints start with /api/events.
 * Request and response bodies are in JSON format.
 */
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService service;

    /**
     * Retrieves all events within an optional time range.
     * 
     * GET /api/events?from=2026-06-13T00:00:00Z&to=2026-06-20T00:00:00Z
     * 
     * @param from the start of the time range (optional, defaults to today)
     * @param to the end of the time range (optional, defaults to 7 days from 'from')
     * @return a list of events matching the criteria
     */
    @GetMapping
    public List<EventResponse> list(
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to) {
        return service.findEvents(from, to);
    }

    /**
     * Creates a new event.
     * 
     * POST /api/events
     * 
     * @param req the EventRequest containing the event data to create
     * @return a 201 Created response with the created event
     */
    @PostMapping
    public ResponseEntity<EventResponse> create(@RequestBody @Valid EventRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    /**
     * Retrieves a single event by ID.
     * 
     * GET /api/events/{id}
     * 
     * @param id the UUID of the event to retrieve
     * @return the requested event
     */
    @GetMapping("/{id}")
    public EventResponse get(@PathVariable UUID id) {
        return service.findById(id);
    }

    /**
     * Updates an existing event.
     * 
     * PUT /api/events/{id}
     * 
     * @param id the UUID of the event to update
     * @param req the EventRequest containing the updated event data
     * @return the updated event
     */
    @PutMapping("/{id}")
    public EventResponse update(@PathVariable UUID id, @RequestBody @Valid EventRequest req) {
        return service.update(id, req);
    }

    /**
     * Deletes an event.
     * 
     * DELETE /api/events/{id}
     * 
     * @param id the UUID of the event to delete
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
