package com.wtbuddy.wtbuddy.controller;

import com.wtbuddy.wtbuddy.dto.request.trip.CreateTripRequest;
import com.wtbuddy.wtbuddy.dto.request.trip.CreateTripStopRequest;
import com.wtbuddy.wtbuddy.dto.request.trip.UpdateTripRequest;
import com.wtbuddy.wtbuddy.dto.response.trip.TripResponse;
import com.wtbuddy.wtbuddy.dto.response.trip.TripStopResponse;
import com.wtbuddy.wtbuddy.service.TripService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class TripController {

    private final TripService tripService;

    @PostMapping
    public ResponseEntity<TripResponse> createTrip(
            @Valid @RequestBody CreateTripRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tripService.createTrip(request, userDetails.getUsername()));
    }

    @GetMapping("/my")
    public ResponseEntity<Page<TripResponse>> getMyTrips(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                tripService.getMyTrips(userDetails.getUsername(), search, PageRequest.of(page, size)));
    }

    @GetMapping
    public ResponseEntity<Page<TripResponse>> getAllPublicTrips(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, size);
        if (search != null && !search.isEmpty()) {
            return ResponseEntity.ok(tripService.searchPublicTrips(search, pageable));
        }
        return ResponseEntity.ok(tripService.getAllPublicTrips(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TripResponse> getTripById(@PathVariable Long id) {
        return ResponseEntity.ok(tripService.getTripById(id));
    }

    @GetMapping("/{id}/stops")
    public ResponseEntity<List<TripStopResponse>> getTripStops(@PathVariable Long id) {
        return ResponseEntity.ok(tripService.getStopsForTrip(id));
    }

    @PutMapping("/{id}/stops")
    public ResponseEntity<List<TripStopResponse>> replaceStops(
            @PathVariable Long id,
            @RequestBody List<CreateTripStopRequest> requests,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tripService.replaceStops(id, requests, userDetails.getUsername()));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<TripResponse>> getTripsByUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(tripService.getTripsByUser(userId, PageRequest.of(page, size)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TripResponse> updateTrip(
            @PathVariable Long id,
            @RequestBody UpdateTripRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tripService.updateTrip(id, request, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTrip(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        tripService.deleteTrip(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
