package com.planner.service;

import com.planner.model.Event;
import com.planner.model.EventRepository;
import com.planner.domain.EventRequest;
import com.planner.domain.EventResponse;
import com.planner.exception.ResourceNotFoundException;
import com.planner.mapper.EventMapper;
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
    private final EventMapper mapper;

    public List<EventResponse> findEvents(Instant from, Instant to) {
        if (from == null) from = Instant.now().truncatedTo(ChronoUnit.DAYS);
        if (to == null)   to = from.plus(7, ChronoUnit.DAYS);
        return repository.findByStartTimeLessThanAndEndTimeGreaterThan(to, from)
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    public EventResponse findById(UUID id) {
        return mapper.toResponse(getOrThrow(id));
    }

    @Transactional
    public EventResponse create(EventRequest req) {
        Event event = mapper.toEntity(req);
        return mapper.toResponse(repository.save(event));
    }

    @Transactional
    public EventResponse update(UUID id, EventRequest req) {
        Event event = getOrThrow(id);
        mapper.mapRequestToEntity(req, event);
        return mapper.toResponse(repository.save(event));
    }

    @Transactional
    public void delete(UUID id) {
        getOrThrow(id);
        repository.deleteById(id);
    }

    private Event getOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
    }
}
