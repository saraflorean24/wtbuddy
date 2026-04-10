package com.wtbuddy.wtbuddy.controller;

import com.wtbuddy.wtbuddy.dto.request.event.CreateEventRequest;
import com.wtbuddy.wtbuddy.dto.request.event.UpdateEventRequest;
import com.wtbuddy.wtbuddy.dto.response.event.EventParticipantResponse;
import com.wtbuddy.wtbuddy.dto.response.event.EventResponse;
import java.util.List;
import java.util.Map;
import com.wtbuddy.wtbuddy.service.EventService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class EventController {

    private final EventService eventService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EventResponse> createEvent(
            @Valid @RequestBody CreateEventRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(eventService.createEvent(request, userDetails.getUsername()));
    }

    @GetMapping
    public ResponseEntity<Page<EventResponse>> getAllEvents(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        Pageable pageable = PageRequest.of(page, size);
        if (search != null && !search.isEmpty()) {
            return ResponseEntity.ok(eventService.searchEvents(search, pageable, email));
        }
        return ResponseEntity.ok(eventService.getAllEvents(pageable, email));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEventById(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getEventById(id));
    }

    @GetMapping("/organizer/{organizerId}")
    public ResponseEntity<Page<EventResponse>> getEventsByOrganizer(
            @PathVariable Long organizerId,
            @PageableDefault() Pageable pageable) {
        return ResponseEntity.ok(eventService.getEventsByOrganizer(organizerId, pageable));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<EventResponse> joinEvent(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(eventService.joinEvent(id, userDetails.getUsername()));
    }

    @GetMapping("/{id}/requests")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<EventParticipantResponse>> getPendingParticipants(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getPendingParticipants(id));
    }

    @PutMapping("/participants/{participantId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EventParticipantResponse> respondToParticipant(
            @PathVariable Long participantId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(eventService.respondToParticipant(participantId, body.get("status")));
    }

    @DeleteMapping("/{id}/leave")
    public ResponseEntity<Void> leaveEvent(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        eventService.leaveEvent(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EventResponse> updateEvent(
            @PathVariable Long id,
            @RequestBody UpdateEventRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(eventService.updateEvent(id, request, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteEvent(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        eventService.deleteEvent(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
