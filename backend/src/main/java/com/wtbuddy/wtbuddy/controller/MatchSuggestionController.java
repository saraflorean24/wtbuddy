package com.wtbuddy.wtbuddy.controller;

import com.wtbuddy.wtbuddy.dto.response.match.MatchSuggestionResponse;
import com.wtbuddy.wtbuddy.service.MatchSuggestionService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class MatchSuggestionController {

    private final MatchSuggestionService matchSuggestionService;

    @PostMapping("/generate")
    public ResponseEntity<List<MatchSuggestionResponse>> generateSuggestions(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(matchSuggestionService.generateSuggestions(userDetails.getUsername()));
    }

    @GetMapping
    public ResponseEntity<Page<MatchSuggestionResponse>> getSuggestions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(matchSuggestionService.getSuggestions(userDetails.getUsername(), page, size));
    }

    @PutMapping("/{id}/dismiss")
    public ResponseEntity<Void> dismissSuggestion(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        matchSuggestionService.dismissSuggestion(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}