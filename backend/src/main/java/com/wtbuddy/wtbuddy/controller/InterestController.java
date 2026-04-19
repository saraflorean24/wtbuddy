package com.wtbuddy.wtbuddy.controller;

import com.wtbuddy.wtbuddy.dto.request.interest.AddUserInterestRequest;
import com.wtbuddy.wtbuddy.dto.request.interest.CreateInterestRequest;
import com.wtbuddy.wtbuddy.dto.response.interest.InterestResponse;
import com.wtbuddy.wtbuddy.service.InterestService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interests")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class InterestController {

    private final InterestService interestService;

    @GetMapping
    public ResponseEntity<List<InterestResponse>> getAllInterests(
            @RequestParam(required = false) String category) {
        if (category != null && !category.isEmpty()) {
            return ResponseEntity.ok(interestService.getInterestsByCategory(category));
        }
        return ResponseEntity.ok(interestService.getAllInterests());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InterestResponse> createInterest(
            @Valid @RequestBody CreateInterestRequest request) {
        return ResponseEntity.ok(interestService.createInterest(request));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<InterestResponse>> getUserInterestsByUserId(
            @PathVariable Long userId) {
        return ResponseEntity.ok(interestService.getUserInterestsByUserId(userId));
    }

    @GetMapping("/me")
    public ResponseEntity<List<InterestResponse>> getUserInterests(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(interestService.getUserInterests(userDetails.getUsername()));
    }

    @PostMapping("/me")
    public ResponseEntity<Void> addUserInterest(
            @Valid @RequestBody AddUserInterestRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        interestService.addUserInterest(request, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/me/{interestId}")
    public ResponseEntity<Void> removeUserInterest(
            @PathVariable Long interestId,
            @AuthenticationPrincipal UserDetails userDetails) {
        interestService.removeUserInterest(interestId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}