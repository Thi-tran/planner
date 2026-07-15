package com.planner.controller;

import com.planner.domain.EventRequest;
import com.planner.domain.EventResponse;
import com.planner.model.entity.UserEntity;
import com.planner.security.CurrentUserService;
import com.planner.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService service;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<EventResponse> list(
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = true) UUID projectId,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return service.findEvents(from, to, projectId, user.getId());
    }

    @PostMapping
    public ResponseEntity<EventResponse> create(
            @RequestBody @Valid EventRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req, user.getId()));
    }

    @GetMapping("/{id}")
    public EventResponse get(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return service.findById(id, user.getId());
    }

    @PutMapping("/{id}")
    public EventResponse update(
            @PathVariable UUID id,
            @RequestBody @Valid EventRequest req,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        return service.update(id, req, user.getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {
        UserEntity user = currentUserService.resolveCurrentUser(jwt);
        service.delete(id, user.getId());
    }
}
