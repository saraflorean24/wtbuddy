package com.wtbuddy.wtbuddy.service;

import com.wtbuddy.wtbuddy.dto.request.auth.LoginRequest;
import com.wtbuddy.wtbuddy.dto.request.auth.RegisterRequest;
import com.wtbuddy.wtbuddy.dto.response.auth.AuthResponse;
import com.wtbuddy.wtbuddy.entity.User;
import com.wtbuddy.wtbuddy.entity.UserProfile;
import com.wtbuddy.wtbuddy.enums.Role;
import com.wtbuddy.wtbuddy.exception.AlreadyExistsException;
import com.wtbuddy.wtbuddy.exception.BadRequestException;
import com.wtbuddy.wtbuddy.repository.UserProfileRepository;
import com.wtbuddy.wtbuddy.repository.UserRepository;
import com.wtbuddy.wtbuddy.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AlreadyExistsException("Email already in use");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AlreadyExistsException("Username already in use");
        }

        User user = User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .isActive(true)
                .build();

        userRepository.save(user);

        UserProfile profile = UserProfile.builder()
                .user(user)
                .fullName(request.getFullName())
                .build();

        userProfileRepository.save(profile);

        String token = jwtService.generateToken(
                org.springframework.security.core.userdetails.User.builder()
                        .username(user.getEmail())
                        .password(user.getPasswordHash())
                        .roles(user.getRole().name())
                        .build()
        );

        return AuthResponse.builder()
                .id(user.getId())
                .token(token)
                .email(user.getEmail())
                .username(user.getUsername())
                .role(user.getRole().name())
                .profileComplete(false)
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        // If password is stored as plain text (not a BCrypt hash), encode it on first login
        if (!user.getPasswordHash().startsWith("$2")) {
            if (!user.getPasswordHash().equals(request.getPassword())) {
                throw new BadRequestException("Invalid email or password");
            }
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            userRepository.save(user);
        } else {
            try {
                authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(
                                request.getEmail(),
                                request.getPassword()
                        )
                );
            } catch (AuthenticationException e) {
                throw new BadRequestException("Invalid email or password");
            }
        }

        String token = jwtService.generateToken(
                org.springframework.security.core.userdetails.User.builder()
                        .username(user.getEmail())
                        .password(user.getPasswordHash())
                        .roles(user.getRole().name())
                        .build()
        );

        boolean profileComplete = userProfileRepository.findByUserId(user.getId())
                .map(p -> p.getJobType() != null)
                .orElse(false);

        return AuthResponse.builder()
                .id(user.getId())
                .token(token)
                .email(user.getEmail())
                .username(user.getUsername())
                .role(user.getRole().name())
                .profileComplete(profileComplete)
                .build();
    }
}