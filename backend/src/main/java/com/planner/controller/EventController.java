package com.planner.controller;

import com.planner.dto.EventRequest;
import com.planner.dto.EventResponse;
import com.planner.exception.ResourceNotFoundException;
import com.planner.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "${cors.allowed-origins}")
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

    // ── Global error handlers ─────────────────────────────────────────────────

    @RestControllerAdvice
    static class GlobalExceptionHandler {

        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<Map<String, String>> handleNotFound(ResourceNotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", ex.getMessage()));
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("error", "Validation failed");
            List<String> errors = ex.getBindingResult().getFieldErrors().stream()
                    .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                    .toList();
            body.put("details", errors);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
        }
    }
}
