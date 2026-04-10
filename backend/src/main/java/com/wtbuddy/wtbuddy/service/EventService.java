package com.wtbuddy.wtbuddy.service;

import com.wtbuddy.wtbuddy.dto.request.event.CreateEventRequest;
import com.wtbuddy.wtbuddy.dto.request.event.UpdateEventRequest;
import com.wtbuddy.wtbuddy.dto.response.event.EventResponse;
import com.wtbuddy.wtbuddy.entity.Event;
import com.wtbuddy.wtbuddy.entity.User;
import com.wtbuddy.wtbuddy.exception.ResourceNotFoundException;
import com.wtbuddy.wtbuddy.exception.UnauthorizedException;
import com.wtbuddy.wtbuddy.entity.EventParticipant;
import com.wtbuddy.wtbuddy.repository.EventParticipantRepository;
import com.wtbuddy.wtbuddy.repository.EventRepository;
import com.wtbuddy.wtbuddy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final EventParticipantRepository eventParticipantRepository;

    @Transactional
    public EventResponse createEvent(CreateEventRequest request, String email) {
        User organizer = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Event event = Event.builder()
                .organizer(organizer)
                .title(request.getTitle())
                .description(request.getDescription())
                .location(request.getLocation())
                .eventDate(request.getEventDate())
                .maxParticipants(request.getMaxParticipants())
                .build();

        eventRepository.save(event);
        return mapToResponse(event);
    }

    public Page<EventResponse> getAllEvents(Pageable pageable) {
        return eventRepository.findAll(pageable).map(this::mapToResponse);
    }

    public Page<EventResponse> searchEvents(String title, Pageable pageable) {
        return eventRepository.findByTitleContainingIgnoreCase(title, pageable)
                .map(this::mapToResponse);
    }

    public Page<EventResponse> getEventsByOrganizer(Long organizerId, Pageable pageable) {
        return eventRepository.findByOrganizerId(organizerId, pageable)
                .map(this::mapToResponse);
    }

    public EventResponse getEventById(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + id));
        return mapToResponse(event);
    }

    @Transactional
    public EventResponse updateEvent(Long id, UpdateEventRequest request, String email) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + id));

        if (!event.getOrganizer().getEmail().equals(email)) {
            throw new UnauthorizedException("You are not the organizer of this event");
        }

        if (request.getTitle() != null) event.setTitle(request.getTitle());
        if (request.getDescription() != null) event.setDescription(request.getDescription());
        if (request.getLocation() != null) event.setLocation(request.getLocation());
        if (request.getEventDate() != null) event.setEventDate(request.getEventDate());
        if (request.getMaxParticipants() != null) event.setMaxParticipants(request.getMaxParticipants());

        eventRepository.save(event);
        return mapToResponse(event);
    }

    @Transactional
    public EventResponse joinEvent(Long id, String email) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + id));

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (event.getOrganizer().getEmail().equals(email)) {
            throw new IllegalStateException("Organizer cannot join their own event");
        }

        if (eventParticipantRepository.existsByEventIdAndUserId(id, user.getId())) {
            throw new IllegalStateException("Already joined this event");
        }

        if (event.getMaxParticipants() != null) {
            long count = eventParticipantRepository.countByEventId(id);
            if (count >= event.getMaxParticipants()) {
                throw new IllegalStateException("Event is full");
            }
        }

        EventParticipant participant = EventParticipant.builder()
                .event(event)
                .user(user)
                .build();
        eventParticipantRepository.save(participant);

        return mapToResponse(event);
    }

    @Transactional
    public void deleteEvent(Long id, String email) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + id));

        if (!event.getOrganizer().getEmail().equals(email)) {
            throw new UnauthorizedException("You are not the organizer of this event");
        }

        eventRepository.delete(event);
    }

    private EventResponse mapToResponse(Event event) {
        int participantCount = (int) eventParticipantRepository.countByEventId(event.getId());
        return EventResponse.builder()
                .id(event.getId())
                .organizerId(event.getOrganizer().getId())
                .organizerUsername(event.getOrganizer().getUsername())
                .title(event.getTitle())
                .description(event.getDescription())
                .location(event.getLocation())
                .eventDate(event.getEventDate())
                .maxParticipants(event.getMaxParticipants())
                .participantCount(participantCount)
                .createdAt(event.getCreatedAt())
                .build();
    }
}