package com.wtbuddy.wtbuddy.controller;

import com.wtbuddy.wtbuddy.dto.request.auth.LoginRequest;
import com.wtbuddy.wtbuddy.dto.request.auth.RegisterRequest;
import com.wtbuddy.wtbuddy.dto.response.auth.AuthResponse;
import com.wtbuddy.wtbuddy.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}