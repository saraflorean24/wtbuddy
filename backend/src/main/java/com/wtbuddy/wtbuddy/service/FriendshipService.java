package com.wtbuddy.wtbuddy.service;

import com.wtbuddy.wtbuddy.dto.request.friendship.FriendshipActionRequest;
import com.wtbuddy.wtbuddy.dto.request.friendship.FriendshipRequest;
import com.wtbuddy.wtbuddy.dto.response.friendship.FriendshipResponse;
import com.wtbuddy.wtbuddy.entity.Friendship;
import com.wtbuddy.wtbuddy.entity.Notification;
import com.wtbuddy.wtbuddy.entity.User;
import com.wtbuddy.wtbuddy.enums.FriendshipStatus;
import com.wtbuddy.wtbuddy.enums.NotificationType;
import com.wtbuddy.wtbuddy.exception.AlreadyExistsException;
import com.wtbuddy.wtbuddy.exception.BadRequestException;
import com.wtbuddy.wtbuddy.exception.ResourceNotFoundException;
import com.wtbuddy.wtbuddy.exception.UnauthorizedException;
import com.wtbuddy.wtbuddy.repository.FriendshipRepository;
import com.wtbuddy.wtbuddy.repository.MatchSuggestionRepository;
import com.wtbuddy.wtbuddy.repository.NotificationRepository;
import com.wtbuddy.wtbuddy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final MatchSuggestionRepository matchSuggestionRepository;
    private final EmailService emailService;

    @Transactional
    public FriendshipResponse sendRequest(FriendshipRequest request, String email) {
        User requester = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        User addressee = userRepository.findById(request.getAddresseeId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getAddresseeId()));

        if (requester.getId().equals(addressee.getId())) {
            throw new BadRequestException("You cannot send a friend request to yourself");
        }

        if (friendshipRepository.existsBetweenUsers(requester.getId(), addressee.getId())) {
            throw new AlreadyExistsException("Friendship already exists between these users");
        }

        // Clean up any previous DECLINED record so a new request can be stored
        friendshipRepository.findBetweenUsers(requester.getId(), addressee.getId())
                .ifPresent(friendshipRepository::delete);

        Friendship friendship = Friendship.builder()
                .requester(requester)
                .addressee(addressee)
                .status(FriendshipStatus.PENDING)
                .build();

        friendshipRepository.save(friendship);

        // Dismiss suggestions in both directions so neither user sees the other as a suggestion
        dismissSuggestionIfExists(requester.getId(), addressee.getId());
        dismissSuggestionIfExists(addressee.getId(), requester.getId());

        emailService.sendFriendRequestEmail(addressee.getEmail(), requester.getUsername());
        notify(addressee, NotificationType.FRIEND_REQUEST,
                requester.getUsername() + " sent you a friend request",
                friendship.getId());
        return mapToResponse(friendship);
    }

    @Transactional
    public FriendshipResponse updateFriendshipStatus(Long friendshipId,
                                                     FriendshipActionRequest request,
                                                     String email) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResourceNotFoundException("Friendship not found"));

        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!friendship.getAddressee().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You are not authorized to update this friendship");
        }

        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new BadRequestException("Friendship is not in pending status");
        }

        friendship.setStatus(request.getStatus());
        friendship.setUpdatedBy(currentUser);
        friendshipRepository.save(friendship);

        if (request.getStatus() == FriendshipStatus.ACCEPTED) {
            emailService.sendFriendAcceptedEmail(friendship.getRequester().getEmail(), currentUser.getUsername());
            notify(friendship.getRequester(), NotificationType.FRIEND_ACCEPTED,
                    currentUser.getUsername() + " accepted your friend request",
                    currentUser.getId());
        }

        return mapToResponse(friendship);
    }

    public List<FriendshipResponse> getFriends(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return friendshipRepository.findByUserIdAndStatus(user.getId(), FriendshipStatus.ACCEPTED)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<FriendshipResponse> getPendingRequests(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return friendshipRepository.findByUserIdAndStatus(user.getId(), FriendshipStatus.PENDING)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public void deleteFriendship(Long friendshipId, String email) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResourceNotFoundException("Friendship not found"));

        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!friendship.getRequester().getId().equals(currentUser.getId()) &&
                !friendship.getAddressee().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You are not authorized to delete this friendship");
        }

        friendshipRepository.delete(friendship);
    }

    private void dismissSuggestionIfExists(Long userId, Long suggestedUserId) {
        matchSuggestionRepository.findByUserIdAndSuggestedUserId(userId, suggestedUserId)
                .ifPresent(s -> {
                    s.setIsDismissed(true);
                    matchSuggestionRepository.save(s);
                });
    }

    private void notify(User user, NotificationType type, String message, Long referenceId) {
        notificationRepository.save(Notification.builder()
                .user(user)
                .type(type)
                .message(message)
                .isRead(false)
                .referenceId(referenceId)
                .build());
    }

    private FriendshipResponse mapToResponse(Friendship friendship) {
        return FriendshipResponse.builder()
                .id(friendship.getId())
                .requesterId(friendship.getRequester().getId())
                .requesterUsername(friendship.getRequester().getUsername())
                .addresseeId(friendship.getAddressee().getId())
                .addresseeUsername(friendship.getAddressee().getUsername())
                .status(friendship.getStatus())
                .createdAt(friendship.getCreatedAt())
                .updatedAt(friendship.getUpdatedAt())
                .build();
    }
}