package com.planner.service;

import com.planner.dto.EventRequest;
import com.planner.dto.EventResponse;
import com.planner.exception.ResourceNotFoundException;
import com.planner.model.Event;
import com.planner.repository.EventRepository;
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

    public List<EventResponse> findEvents(Instant from, Instant to) {
        if (from == null) from = Instant.now().truncatedTo(ChronoUnit.DAYS);
        if (to == null)   to = from.plus(7, ChronoUnit.DAYS);
        return repository.findByStartTimeLessThanAndEndTimeGreaterThan(to, from)
                .stream()
                .map(EventResponse::from)
                .toList();
    }

    public EventResponse findById(UUID id) {
        return EventResponse.from(getOrThrow(id));
    }

    @Transactional
    public EventResponse create(EventRequest req) {
        Event event = new Event();
        applyRequest(event, req);
        return EventResponse.from(repository.save(event));
    }

    @Transactional
    public EventResponse update(UUID id, EventRequest req) {
        Event event = getOrThrow(id);
        applyRequest(event, req);
        return EventResponse.from(repository.save(event));
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

    private void applyRequest(Event event, EventRequest req) {
        event.setTitle(req.getTitle());
        event.setDescription(req.getDescription());
        event.setStartTime(req.getStartTime());
        event.setEndTime(req.getEndTime());
        event.setColor(req.getColor());
    }
}
