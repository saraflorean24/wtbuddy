package com.wtbuddy.wtbuddy.controller;

import com.wtbuddy.wtbuddy.dto.request.friendship.FriendshipActionRequest;
import com.wtbuddy.wtbuddy.dto.request.friendship.FriendshipRequest;
import com.wtbuddy.wtbuddy.dto.response.friendship.FriendshipResponse;
import com.wtbuddy.wtbuddy.service.FriendshipService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/friendships")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class FriendshipController {

    private final FriendshipService friendshipService;

    @PostMapping
    public ResponseEntity<FriendshipResponse> sendRequest(
            @Valid @RequestBody FriendshipRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(friendshipService.sendRequest(request, userDetails.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FriendshipResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody FriendshipActionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(friendshipService.updateFriendshipStatus(id, request, userDetails.getUsername()));
    }

    @GetMapping("/friends")
    public ResponseEntity<List<FriendshipResponse>> getFriends(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(friendshipService.getFriends(userDetails.getUsername()));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<FriendshipResponse>> getPendingRequests(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(friendshipService.getPendingRequests(userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFriendship(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        friendshipService.deleteFriendship(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}