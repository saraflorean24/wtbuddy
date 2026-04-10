package com.wtbuddy.wtbuddy.controller;

import com.wtbuddy.wtbuddy.dto.request.feedback.CreateFeedbackRequest;
import com.wtbuddy.wtbuddy.dto.response.feedback.FeedbackResponse;
import com.wtbuddy.wtbuddy.service.FeedbackService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class FeedbackController {

    private final FeedbackService feedbackService;

    @GetMapping("/public")
    public ResponseEntity<List<FeedbackResponse>> getPublicTestimonials() {
        return ResponseEntity.ok(feedbackService.getPublicTestimonials());
    }

    @PostMapping
    public ResponseEntity<FeedbackResponse> submit(
            @Valid @RequestBody CreateFeedbackRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(feedbackService.submit(request, userDetails.getUsername()));
    }

    @GetMapping("/my")
    public ResponseEntity<Page<FeedbackResponse>> getMyFeedback(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(feedbackService.getMyFeedback(userDetails.getUsername(), page, size));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<FeedbackResponse>> getAllFeedback(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(feedbackService.getAllFeedback(page, size));
    }
}
