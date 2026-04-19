package com.wtbuddy.wtbuddy.controller;

import com.wtbuddy.wtbuddy.dto.request.user.UpdateProfileRequest;
import com.wtbuddy.wtbuddy.dto.response.user.UserProfileResponse;
import com.wtbuddy.wtbuddy.dto.response.user.UserResponse;
import com.wtbuddy.wtbuddy.exception.UnauthorizedException;
import com.wtbuddy.wtbuddy.service.UserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getCurrentUser(userDetails.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        UserResponse current = userService.getCurrentUser(userDetails.getUsername());
        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !current.getId().equals(id)) {
            throw new UnauthorizedException("You can only access your own user data");
        }
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping("/{id}/profile")
    public ResponseEntity<UserProfileResponse> getUserProfile(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        UserResponse current = userService.getCurrentUser(userDetails.getUsername());
        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !current.getId().equals(id)) {
            throw new UnauthorizedException("You can only access your own profile");
        }
        return ResponseEntity.ok(userService.getProfileByUserId(id));
    }

    @PutMapping("/{id}/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @PathVariable Long id,
            @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        UserResponse current = userService.getCurrentUser(userDetails.getUsername());
        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin && !current.getId().equals(id)) {
            throw new UnauthorizedException("You can only update your own profile");
        }
        return ResponseEntity.ok(userService.updateProfile(id, request));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(userService.getAllUsers(PageRequest.of(page, size)));
    }
}
