package com.wtbuddy.wtbuddy.service;

import com.wtbuddy.wtbuddy.dto.request.event.CreateEventRequest;
import com.wtbuddy.wtbuddy.dto.request.event.UpdateEventRequest;
import com.wtbuddy.wtbuddy.dto.response.event.EventParticipantResponse;
import com.wtbuddy.wtbuddy.dto.response.event.EventResponse;
import com.wtbuddy.wtbuddy.entity.Event;
import com.wtbuddy.wtbuddy.entity.User;
import com.wtbuddy.wtbuddy.entity.Notification;
import com.wtbuddy.wtbuddy.enums.NotificationType;
import com.wtbuddy.wtbuddy.enums.ParticipantStatus;
import com.wtbuddy.wtbuddy.exception.BadRequestException;
import com.wtbuddy.wtbuddy.exception.ResourceNotFoundException;
import com.wtbuddy.wtbuddy.exception.UnauthorizedException;
import com.wtbuddy.wtbuddy.entity.EventParticipant;
import com.wtbuddy.wtbuddy.repository.EventParticipantRepository;
import com.wtbuddy.wtbuddy.repository.EventRepository;
import com.wtbuddy.wtbuddy.repository.NotificationRepository;
import com.wtbuddy.wtbuddy.repository.UserRepository;
import java.util.List;
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
    private final NotificationRepository notificationRepository;

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
        return mapToResponse(event, null);
    }

    public Page<EventResponse> getAllEvents(Pageable pageable, String email) {
        Long userId = resolveUserId(email);
        return eventRepository.findAll(pageable).map(e -> mapToResponse(e, userId));
    }

    public Page<EventResponse> searchEvents(String title, Pageable pageable, String email) {
        Long userId = resolveUserId(email);
        return eventRepository.findByTitleContainingIgnoreCase(title, pageable)
                .map(e -> mapToResponse(e, userId));
    }

    public Page<EventResponse> getEventsByOrganizer(Long organizerId, Pageable pageable) {
        return eventRepository.findByOrganizerId(organizerId, pageable)
                .map(e -> mapToResponse(e, null));
    }

    public EventResponse getEventById(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with id: " + id));
        return mapToResponse(event, null);
    }

    private Long resolveUserId(String email) {
        if (email == null) return null;
        return userRepository.findByEmail(email).map(User::getId).orElse(null);
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
        return mapToResponse(event, null);
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

        eventParticipantRepository.findByEventIdAndUserId(id, user.getId()).ifPresent(existing -> {
            if (existing.getStatus() == ParticipantStatus.PENDING || existing.getStatus() == ParticipantStatus.ACCEPTED) {
                throw new IllegalStateException("Already joined this event");
            }
            if (existing.getStatus() == ParticipantStatus.DECLINED && Boolean.TRUE.equals(existing.getDeclinedByOwner())) {
                throw new BadRequestException("Your join request was declined by the organizer");
            }
            eventParticipantRepository.delete(existing);
        });

        if (event.getMaxParticipants() != null) {
            long count = eventParticipantRepository.countByEventIdAndStatus(id, ParticipantStatus.ACCEPTED);
            if (count >= event.getMaxParticipants()) {
                throw new IllegalStateException("Event is full");
            }
        }

        EventParticipant participant = EventParticipant.builder()
                .event(event)
                .user(user)
                .build();
        eventParticipantRepository.save(participant);

        notifyUser(event.getOrganizer(), NotificationType.EVENT_JOIN_REQUEST,
                user.getUsername() + " wants to join your event '" + event.getTitle() + "'");

        return mapToResponse(event, user.getId());
    }

    public List<EventParticipantResponse> getPendingParticipants(Long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found with id: " + eventId);
        }
        return eventParticipantRepository.findByEventIdAndStatus(eventId, ParticipantStatus.PENDING)
                .stream()
                .map(this::mapParticipantToResponse)
                .toList();
    }

    public List<EventParticipantResponse> getAcceptedParticipants(Long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found with id: " + eventId);
        }
        return eventParticipantRepository.findByEventIdAndStatus(eventId, ParticipantStatus.ACCEPTED)
                .stream()
                .map(this::mapParticipantToResponse)
                .toList();
    }

    @Transactional
    public EventParticipantResponse respondToParticipant(Long participantId, String statusStr) {
        EventParticipant participant = eventParticipantRepository.findById(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Participant not found"));

        if (participant.getStatus() != ParticipantStatus.PENDING) {
            throw new BadRequestException("This request is no longer pending");
        }

        ParticipantStatus newStatus;
        try {
            newStatus = ParticipantStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Status must be ACCEPTED or DECLINED");
        }
        if (newStatus == ParticipantStatus.PENDING) {
            throw new BadRequestException("Status must be ACCEPTED or DECLINED");
        }

        participant.setStatus(newStatus);
        if (newStatus == ParticipantStatus.DECLINED) {
            participant.setDeclinedByOwner(true);
        }
        eventParticipantRepository.save(participant);

        Event event = participant.getEvent();
        User requester = participant.getUser();
        if (newStatus == ParticipantStatus.ACCEPTED) {
            notifyUser(requester, NotificationType.EVENT_JOIN_ACCEPTED,
                    "Your request to join '" + event.getTitle() + "' has been accepted!");
        } else {
            notifyUser(requester, NotificationType.EVENT_JOIN_DECLINED,
                    "Your request to join '" + event.getTitle() + "' has been declined.");
        }

        return mapParticipantToResponse(participant);
    }

    public List<EventParticipantResponse> getDeclinedParticipants(Long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found with id: " + eventId);
        }
        return eventParticipantRepository.findByEventIdAndDeclinedByOwnerTrue(eventId)
                .stream()
                .map(this::mapParticipantToResponse)
                .toList();
    }

    @Transactional
    public EventParticipantResponse reinviteParticipant(Long participantId) {
        EventParticipant participant = eventParticipantRepository.findById(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("Participant not found"));

        if (participant.getStatus() != ParticipantStatus.DECLINED || !Boolean.TRUE.equals(participant.getDeclinedByOwner())) {
            throw new BadRequestException("Can only re-invite participants whose request was declined");
        }

        participant.setStatus(ParticipantStatus.INVITED);
        participant.setDeclinedByOwner(false);
        eventParticipantRepository.save(participant);

        notifyUser(participant.getUser(), NotificationType.EVENT_INVITE,
                "You have been invited to join the event '" + participant.getEvent().getTitle() + "'!");

        return mapParticipantToResponse(participant);
    }

    @Transactional
    public EventParticipantResponse acceptEventInvitation(Long eventId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        EventParticipant participant = eventParticipantRepository
                .findByEventIdAndUserId(eventId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        if (participant.getStatus() != ParticipantStatus.INVITED) {
            throw new BadRequestException("No pending invitation found");
        }

        participant.setStatus(ParticipantStatus.ACCEPTED);
        eventParticipantRepository.save(participant);

        notifyUser(participant.getEvent().getOrganizer(), NotificationType.EVENT_JOIN_ACCEPTED,
                user.getUsername() + " accepted your invitation to '" + participant.getEvent().getTitle() + "'");

        return mapParticipantToResponse(participant);
    }

    @Transactional
    public void declineEventInvitation(Long eventId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        EventParticipant participant = eventParticipantRepository
                .findByEventIdAndUserId(eventId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        if (participant.getStatus() != ParticipantStatus.INVITED) {
            throw new BadRequestException("No pending invitation found");
        }

        participant.setStatus(ParticipantStatus.DECLINED);
        participant.setDeclinedByOwner(false);
        eventParticipantRepository.save(participant);
    }

    private void notifyUser(User user, NotificationType type, String message) {
        notificationRepository.save(Notification.builder()
                .user(user)
                .type(type)
                .message(message)
                .isRead(false)
                .build());
    }

    @Transactional
    public void leaveEvent(Long id, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        EventParticipant participant = eventParticipantRepository
                .findByEventIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("You have not joined this event"));
        eventParticipantRepository.delete(participant);
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

    private EventParticipantResponse mapParticipantToResponse(EventParticipant p) {
        return EventParticipantResponse.builder()
                .id(p.getId())
                .userId(p.getUser().getId())
                .username(p.getUser().getUsername())
                .status(p.getStatus())
                .declinedByOwner(p.getDeclinedByOwner())
                .joinedAt(p.getJoinedAt())
                .build();
    }

    private EventResponse mapToResponse(Event event, Long currentUserId) {
        int participantCount = (int) eventParticipantRepository
                .countByEventIdAndStatus(event.getId(), ParticipantStatus.ACCEPTED);
        String myStatus = null;
        Boolean myDeclinedByOwner = null;
        if (currentUserId != null) {
            var myParticipant = eventParticipantRepository
                    .findByEventIdAndUserId(event.getId(), currentUserId);
            myStatus = myParticipant.map(p -> p.getStatus().name()).orElse(null);
            myDeclinedByOwner = myParticipant.map(EventParticipant::getDeclinedByOwner).orElse(null);
        }
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
                .myParticipantStatus(myStatus)
                .myParticipantDeclinedByOwner(myDeclinedByOwner)
                .createdAt(event.getCreatedAt())
                .build();
    }
}