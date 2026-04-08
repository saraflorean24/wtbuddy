package com.wtbuddy.wtbuddy.service;

import com.wtbuddy.wtbuddy.dto.request.user.UpdateProfileRequest;
import com.wtbuddy.wtbuddy.dto.response.user.UserProfileResponse;
import com.wtbuddy.wtbuddy.dto.response.user.UserResponse;
import com.wtbuddy.wtbuddy.entity.User;
import com.wtbuddy.wtbuddy.entity.UserProfile;
import com.wtbuddy.wtbuddy.exception.ResourceNotFoundException;
import com.wtbuddy.wtbuddy.repository.UserProfileRepository;
import com.wtbuddy.wtbuddy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return mapToUserResponse(user);
    }

    public UserProfileResponse getProfileByUserId(Long userId) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found for user: " + userId));
        return mapToProfileResponse(profile);
    }

    @Transactional
    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found for user: " + userId));

        if (request.getFullName() != null) profile.setFullName(request.getFullName());
        if (request.getBio() != null) profile.setBio(request.getBio());
        if (request.getJobCity() != null) profile.setJobCity(request.getJobCity());
        if (request.getJobState() != null) profile.setJobState(request.getJobState());
        if (request.getJobType() != null) profile.setJobType(request.getJobType());
        if (request.getProgramStart() != null) profile.setProgramStart(request.getProgramStart());
        if (request.getProgramEnd() != null) profile.setProgramEnd(request.getProgramEnd());
        if (request.getProfilePhotoUrl() != null) profile.setProfilePhotoUrl(request.getProfilePhotoUrl());

        userProfileRepository.save(profile);
        return mapToProfileResponse(profile);
    }

    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::mapToUserResponse);
    }

    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return mapToUserResponse(user);
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private UserProfileResponse mapToProfileResponse(UserProfile profile) {
        return UserProfileResponse.builder()
                .id(profile.getId())
                .userId(profile.getUser().getId())
                .fullName(profile.getFullName())
                .bio(profile.getBio())
                .jobCity(profile.getJobCity())
                .jobState(profile.getJobState())
                .jobType(profile.getJobType())
                .programStart(profile.getProgramStart())
                .programEnd(profile.getProgramEnd())
                .profilePhotoUrl(profile.getProfilePhotoUrl())
                .build();
    }
}