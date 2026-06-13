package com.planner.controller;

import com.planner.domain.EventRequest;
import com.planner.domain.EventResponse;
import com.planner.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService service;

    @GetMapping
    public List<EventResponse> list(
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to) {
        return service.findEvents(from, to);
    }

    @PostMapping
    public ResponseEntity<EventResponse> create(@RequestBody @Valid EventRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @GetMapping("/{id}")
    public EventResponse get(@PathVariable UUID id) {
        return service.findById(id);
    }

    @PutMapping("/{id}")
    public EventResponse update(@PathVariable UUID id, @RequestBody @Valid EventRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
