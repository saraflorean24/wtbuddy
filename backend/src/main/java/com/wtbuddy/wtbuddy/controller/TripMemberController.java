package com.wtbuddy.wtbuddy.controller;

import com.wtbuddy.wtbuddy.dto.request.trip.TripMemberActionRequest;
import com.wtbuddy.wtbuddy.dto.response.trip.TripMemberResponse;
import com.wtbuddy.wtbuddy.service.TripMemberService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class TripMemberController {

    private final TripMemberService tripMemberService;

    @PostMapping("/{tripId}/join")
    public ResponseEntity<TripMemberResponse> requestToJoin(
            @PathVariable Long tripId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tripMemberService.requestToJoin(tripId, userDetails.getUsername()));
    }

    @PutMapping("/members/{memberId}")
    public ResponseEntity<TripMemberResponse> respondToRequest(
            @PathVariable Long memberId,
            @Valid @RequestBody TripMemberActionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tripMemberService.respondToRequest(memberId, request, userDetails.getUsername()));
    }

    @GetMapping("/{tripId}/members")
    public ResponseEntity<List<TripMemberResponse>> getMembers(@PathVariable Long tripId) {
        return ResponseEntity.ok(tripMemberService.getAcceptedMembers(tripId));
    }

    @GetMapping("/{tripId}/requests")
    public ResponseEntity<List<TripMemberResponse>> getPendingRequests(
            @PathVariable Long tripId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tripMemberService.getPendingRequests(tripId, userDetails.getUsername()));
    }

    @GetMapping("/{tripId}/my-membership")
    public ResponseEntity<TripMemberResponse> getMyMembership(
            @PathVariable Long tripId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return tripMemberService.getMyMembership(tripId, userDetails.getUsername())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @DeleteMapping("/members/{memberId}")
    public ResponseEntity<Void> cancelOrLeave(
            @PathVariable Long memberId,
            @AuthenticationPrincipal UserDetails userDetails) {
        tripMemberService.cancelOrLeave(memberId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{tripId}/declined")
    public ResponseEntity<List<TripMemberResponse>> getDeclinedRequests(
            @PathVariable Long tripId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tripMemberService.getDeclinedByOwnerRequests(tripId, userDetails.getUsername()));
    }

    @PostMapping("/members/{memberId}/reinvite")
    public ResponseEntity<TripMemberResponse> reinviteUser(
            @PathVariable Long memberId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tripMemberService.reinviteUser(memberId, userDetails.getUsername()));
    }

    @PostMapping("/members/{memberId}/accept-invite")
    public ResponseEntity<TripMemberResponse> acceptInvitation(
            @PathVariable Long memberId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tripMemberService.acceptInvitation(memberId, userDetails.getUsername()));
    }

    @PostMapping("/members/{memberId}/decline-invite")
    public ResponseEntity<Void> declineInvitation(
            @PathVariable Long memberId,
            @AuthenticationPrincipal UserDetails userDetails) {
        tripMemberService.declineInvitation(memberId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{tripId}/subscribe")
    public ResponseEntity<Void> subscribe(
            @PathVariable Long tripId,
            @AuthenticationPrincipal UserDetails userDetails) {
        tripMemberService.subscribeToSpotNotification(tripId, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{tripId}/subscribe")
    public ResponseEntity<Void> unsubscribe(
            @PathVariable Long tripId,
            @AuthenticationPrincipal UserDetails userDetails) {
        tripMemberService.unsubscribeFromSpotNotification(tripId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{tripId}/subscribe")
    public ResponseEntity<Boolean> isSubscribed(
            @PathVariable Long tripId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tripMemberService.isSubscribed(tripId, userDetails.getUsername()));
    }
}
