package com.planner.service;

import com.planner.domain.EventRequest;
import com.planner.domain.EventResponse;
import com.planner.exception.ResourceNotFoundException;
import com.planner.mapper.EventMapper;
import com.planner.model.CategoryRepository;
import com.planner.model.EventEntity;
import com.planner.model.EventRepository;
import com.planner.model.entity.CategoryEntity;
import com.planner.model.entity.Role;
import com.planner.security.ProjectAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository repository;
    private final CategoryRepository categoryRepository;
    private final EventMapper mapper;
    private final ProjectAccessService projectAccessService;

    public List<EventResponse> findEvents(Instant from, Instant to, UUID projectId, UUID userId) {
        if (from == null) from = Instant.now().truncatedTo(ChronoUnit.DAYS);
        if (to == null)   to = from.plus(7, ChronoUnit.DAYS);

        projectAccessService.requireRole(projectId, userId, Role.VIEWER);

        return repository.findByProjectIdAndStartTimeLessThanAndEndTimeGreaterThan(projectId, to, from)
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    public EventResponse findById(UUID id, UUID userId) {
        EventEntity event = getOrThrow(id);
        projectAccessService.requireRole(event.getProjectId(), userId, Role.VIEWER);
        return mapper.toResponse(event);
    }

    @Transactional
    public EventResponse create(EventRequest req, UUID userId) {
        projectAccessService.requireRole(req.getProjectId(), userId, Role.EDITOR);
        EventEntity event = mapper.toEntity(req);
        resolveCategory(req, event);
        return mapper.toResponse(repository.save(event));
    }

    @Transactional
    public EventResponse update(UUID id, EventRequest req, UUID userId) {
        EventEntity event = getOrThrow(id);
        projectAccessService.requireRole(event.getProjectId(), userId, Role.EDITOR);

        if (req.getProjectId() != null && !req.getProjectId().equals(event.getProjectId())) {
            throw new IllegalArgumentException("Changing an event's project is not allowed");
        }

        mapper.mapRequestToEntity(req, event);
        resolveCategory(req, event);
        return mapper.toResponse(repository.save(event));
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        EventEntity event = getOrThrow(id);
        projectAccessService.requireRole(event.getProjectId(), userId, Role.EDITOR);
        repository.deleteById(id);
    }

    private void resolveCategory(EventRequest req, EventEntity event) {
        if (req.getCategoryId() != null) {
            CategoryEntity cat = categoryRepository.findById(req.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + req.getCategoryId()));
            if (!cat.getProjectId().equals(event.getProjectId())) {
                throw new IllegalArgumentException("Category does not belong to the event's project");
            }
            event.setCategory(cat);
        } else {
            event.setCategory(null);
        }
    }

    private EventEntity getOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
    }
}
