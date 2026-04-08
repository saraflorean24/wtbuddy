package com.wtbuddy.wtbuddy.service;

import com.wtbuddy.wtbuddy.dto.request.friendship.FriendshipActionRequest;
import com.wtbuddy.wtbuddy.dto.request.friendship.FriendshipRequest;
import com.wtbuddy.wtbuddy.dto.response.friendship.FriendshipResponse;
import com.wtbuddy.wtbuddy.entity.Friendship;
import com.wtbuddy.wtbuddy.entity.User;
import com.wtbuddy.wtbuddy.enums.FriendshipStatus;
import com.wtbuddy.wtbuddy.exception.AlreadyExistsException;
import com.wtbuddy.wtbuddy.exception.BadRequestException;
import com.wtbuddy.wtbuddy.exception.ResourceNotFoundException;
import com.wtbuddy.wtbuddy.exception.UnauthorizedException;
import com.wtbuddy.wtbuddy.repository.FriendshipRepository;
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

        Friendship friendship = Friendship.builder()
                .requester(requester)
                .addressee(addressee)
                .status(FriendshipStatus.PENDING)
                .build();

        friendshipRepository.save(friendship);
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