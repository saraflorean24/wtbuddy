package com.wtbuddy.wtbuddy.service;

import com.wtbuddy.wtbuddy.dto.response.match.MatchSuggestionResponse;
import com.wtbuddy.wtbuddy.entity.MatchSuggestion;
import com.wtbuddy.wtbuddy.entity.User;
import com.wtbuddy.wtbuddy.entity.UserProfile;
import com.wtbuddy.wtbuddy.exception.ResourceNotFoundException;
import com.wtbuddy.wtbuddy.repository.FriendshipRepository;
import com.wtbuddy.wtbuddy.repository.MatchSuggestionRepository;
import com.wtbuddy.wtbuddy.repository.UserInterestRepository;
import com.wtbuddy.wtbuddy.repository.UserProfileRepository;
import com.wtbuddy.wtbuddy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.dao.DataIntegrityViolationException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MatchSuggestionService {

    private final MatchSuggestionRepository matchSuggestionRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserInterestRepository userInterestRepository;
    private final FriendshipRepository friendshipRepository;

    public List<MatchSuggestionResponse> generateSuggestions(String email) {
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserProfile currentProfile = userProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found"));

        Set<Long> currentInterestIds = userInterestRepository.findByUserId(currentUser.getId())
                .stream()
                .map(ui -> ui.getInterest().getId())
                .collect(Collectors.toSet());

        List<User> allUsers = userRepository.findAll();
        List<MatchSuggestionResponse> suggestions = new ArrayList<>();

        for (User otherUser : allUsers) {
            if (otherUser.getId().equals(currentUser.getId())) continue;
            if (!otherUser.getIsActive()) continue;
            if (friendshipRepository.existsBetweenUsers(currentUser.getId(), otherUser.getId())) continue;
            if (matchSuggestionRepository.existsByUserIdAndSuggestedUserId(currentUser.getId(), otherUser.getId())) continue;

            Optional<UserProfile> otherProfileOpt = userProfileRepository.findByUserId(otherUser.getId());
            if (otherProfileOpt.isEmpty()) continue;

            UserProfile otherProfile = otherProfileOpt.get();

            float score = calculateScore(currentProfile, currentInterestIds, otherProfile, otherUser);
            if (score == 0) continue;

            String reason = buildReason(currentProfile, currentInterestIds, otherProfile, otherUser);

            try {
                MatchSuggestion suggestion = MatchSuggestion.builder()
                        .user(currentUser)
                        .suggestedUser(otherUser)
                        .compatibilityScore(score)
                        .reason(reason)
                        .isDismissed(false)
                        .build();

                matchSuggestionRepository.save(suggestion);
                suggestions.add(mapToResponse(suggestion, otherUser, otherProfile));
            } catch (DataIntegrityViolationException ignored) {
                // Duplicate — already exists, skip
            }
        }

        return suggestions;
    }

    public Page<MatchSuggestionResponse> getSuggestions(String email, int page, int size) {
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return matchSuggestionRepository
                .findByUserIdAndIsDismissedFalse(currentUser.getId(), PageRequest.of(page, size))
                .map(suggestion -> {
                    User suggestedUser = suggestion.getSuggestedUser();
                    UserProfile suggestedProfile = userProfileRepository
                            .findByUserId(suggestedUser.getId())
                            .orElse(null);
                    return mapToResponse(suggestion, suggestedUser, suggestedProfile);
                });
    }

    @Transactional
    public void dismissSuggestion(Long suggestionId, String email) {
        MatchSuggestion suggestion = matchSuggestionRepository.findById(suggestionId)
                .orElseThrow(() -> new ResourceNotFoundException("Suggestion not found"));

        if (!suggestion.getUser().getEmail().equals(email)) {
            throw new ResourceNotFoundException("Suggestion not found");
        }

        suggestion.setIsDismissed(true);
        matchSuggestionRepository.save(suggestion);
    }

    private float calculateScore(UserProfile currentProfile, Set<Long> currentInterestIds,
                                 UserProfile otherProfile, User otherUser) {
        float score = 0;

        // 40% - common interests
        if (!currentInterestIds.isEmpty()) {
            Set<Long> otherInterestIds = userInterestRepository.findByUserId(otherUser.getId())
                    .stream()
                    .map(ui -> ui.getInterest().getId())
                    .collect(Collectors.toSet());

            long commonInterests = currentInterestIds.stream()
                    .filter(otherInterestIds::contains)
                    .count();

            if (!otherInterestIds.isEmpty()) {
                float interestScore = (float) commonInterests / Math.max(currentInterestIds.size(), otherInterestIds.size());
                score += interestScore * 40;
            }
        }

        // 30% - same job type
        if (currentProfile.getJobType() != null && otherProfile.getJobType() != null) {
            if (currentProfile.getJobType().equals(otherProfile.getJobType())) {
                score += 30;
            }
        }

        // 30% - same city
        if (currentProfile.getJobCity() != null && otherProfile.getJobCity() != null) {
            if (currentProfile.getJobCity().equalsIgnoreCase(otherProfile.getJobCity())) {
                score += 30;
            }
        }

        return score;
    }

    private String buildReason(UserProfile currentProfile, Set<Long> currentInterestIds,
                               UserProfile otherProfile, User otherUser) {
        List<String> reasons = new ArrayList<>();

        Set<Long> otherInterestIds = userInterestRepository.findByUserId(otherUser.getId())
                .stream()
                .map(ui -> ui.getInterest().getId())
                .collect(Collectors.toSet());

        long commonInterests = currentInterestIds.stream()
                .filter(otherInterestIds::contains)
                .count();

        if (commonInterests > 0) {
            reasons.add(commonInterests + " common interests");
        }

        if (currentProfile.getJobType() != null && currentProfile.getJobType().equals(otherProfile.getJobType())) {
            reasons.add("same job type");
        }

        if (currentProfile.getJobCity() != null && otherProfile.getJobCity() != null &&
                currentProfile.getJobCity().equalsIgnoreCase(otherProfile.getJobCity())) {
            reasons.add("working in " + currentProfile.getJobCity());
        }

        return String.join(", ", reasons);
    }

    private MatchSuggestionResponse mapToResponse(MatchSuggestion suggestion,
                                                  User suggestedUser,
                                                  UserProfile suggestedProfile) {
        return MatchSuggestionResponse.builder()
                .id(suggestion.getId())
                .suggestedUserId(suggestedUser.getId())
                .suggestedUsername(suggestedUser.getUsername())
                .suggestedFullName(suggestedProfile != null ? suggestedProfile.getFullName() : null)
                .profilePhotoUrl(suggestedProfile != null ? suggestedProfile.getProfilePhotoUrl() : null)
                .jobType(suggestedProfile != null ? suggestedProfile.getJobType() : null)
                .jobCity(suggestedProfile != null ? suggestedProfile.getJobCity() : null)
                .compatibilityScore(suggestion.getCompatibilityScore())
                .reason(suggestion.getReason())
                .isDismissed(suggestion.getIsDismissed())
                .createdAt(suggestion.getCreatedAt())
                .build();
    }
}