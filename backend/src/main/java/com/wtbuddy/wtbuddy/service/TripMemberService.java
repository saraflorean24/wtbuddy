package com.wtbuddy.wtbuddy.service;

import com.wtbuddy.wtbuddy.dto.request.trip.TripMemberActionRequest;
import com.wtbuddy.wtbuddy.dto.response.trip.TripMemberResponse;
import com.wtbuddy.wtbuddy.entity.Notification;
import com.wtbuddy.wtbuddy.entity.Trip;
import com.wtbuddy.wtbuddy.entity.TripMember;
import com.wtbuddy.wtbuddy.entity.User;
import com.wtbuddy.wtbuddy.enums.NotificationType;
import com.wtbuddy.wtbuddy.enums.TripMemberStatus;
import com.wtbuddy.wtbuddy.exception.AlreadyExistsException;
import com.wtbuddy.wtbuddy.exception.BadRequestException;
import com.wtbuddy.wtbuddy.exception.ResourceNotFoundException;
import com.wtbuddy.wtbuddy.exception.UnauthorizedException;
import com.wtbuddy.wtbuddy.repository.FriendshipRepository;
import com.wtbuddy.wtbuddy.repository.NotificationRepository;
import com.wtbuddy.wtbuddy.repository.TripMemberRepository;
import com.wtbuddy.wtbuddy.repository.TripRepository;
import com.wtbuddy.wtbuddy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TripMemberService {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    @Transactional
    public TripMemberResponse requestToJoin(Long tripId, String email) {
        User requester = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + tripId));

        if (trip.getUser().getId().equals(requester.getId())) {
            throw new BadRequestException("You cannot request to join your own trip");
        }

        if (tripMemberRepository.existsByTripIdAndUserId(tripId, requester.getId())) {
            throw new AlreadyExistsException("You already have a join request or membership for this trip");
        }

        if (!trip.getIsPublic()) {
            boolean areFriends = friendshipRepository.existsAcceptedBetweenUsers(
                    requester.getId(), trip.getUser().getId());
            if (!areFriends) {
                throw new UnauthorizedException("This trip is private. Only friends of the creator can request to join.");
            }
        }

        TripMember member = TripMember.builder()
                .trip(trip)
                .user(requester)
                .status(TripMemberStatus.PENDING)
                .build();

        tripMemberRepository.save(member);

        notifyUser(trip.getUser(),
                NotificationType.TRIP_JOIN_REQUEST,
                requester.getUsername() + " wants to join your trip '" + trip.getTitle() + "'");

        emailService.sendTripJoinRequestEmail(trip.getUser().getEmail(), requester.getUsername(), trip.getTitle());

        return mapToResponse(member);
    }

    @Transactional
    public TripMemberResponse respondToRequest(Long memberId, TripMemberActionRequest request, String email) {
        TripMember member = tripMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip join request not found"));

        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!member.getTrip().getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Only the trip creator can accept or decline join requests");
        }

        if (member.getStatus() != TripMemberStatus.PENDING) {
            throw new BadRequestException("This join request is no longer pending");
        }

        TripMemberStatus newStatus = request.getStatus();
        if (newStatus == TripMemberStatus.PENDING) {
            throw new BadRequestException("Status must be ACCEPTED or DECLINED");
        }

        member.setStatus(newStatus);
        member.setUpdatedBy(currentUser);
        tripMemberRepository.save(member);

        Trip trip = member.getTrip();
        User requester = member.getUser();

        if (newStatus == TripMemberStatus.ACCEPTED) {
            notifyUser(requester,
                    NotificationType.TRIP_JOIN_ACCEPTED,
                    "Your request to join the trip '" + trip.getTitle() + "' has been accepted!");
            emailService.sendTripJoinAcceptedEmail(requester.getEmail(), trip.getTitle());
        } else {
            notifyUser(requester,
                    NotificationType.TRIP_JOIN_DECLINED,
                    "Your request to join the trip '" + trip.getTitle() + "' has been declined.");
            emailService.sendTripJoinDeclinedEmail(requester.getEmail(), trip.getTitle());
        }

        return mapToResponse(member);
    }

    public List<TripMemberResponse> getAcceptedMembers(Long tripId) {
        tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + tripId));
        return tripMemberRepository.findByTripIdAndStatus(tripId, TripMemberStatus.ACCEPTED)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<TripMemberResponse> getPendingRequests(Long tripId, String email) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + tripId));

        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!trip.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Only the trip creator can view pending join requests");
        }

        return tripMemberRepository.findByTripIdAndStatus(tripId, TripMemberStatus.PENDING)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public java.util.Optional<TripMemberResponse> getMyMembership(Long tripId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return tripMemberRepository.findByTripIdAndUserId(tripId, user.getId())
                .map(this::mapToResponse);
    }

    @Transactional
    public void cancelOrLeave(Long memberId, String email) {
        TripMember member = tripMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip membership not found"));

        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!member.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You can only cancel your own join request or leave your own trips");
        }

        tripMemberRepository.delete(member);
    }

    private void notifyUser(User user, NotificationType type, String message) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .message(message)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }

    private TripMemberResponse mapToResponse(TripMember member) {
        return TripMemberResponse.builder()
                .id(member.getId())
                .tripId(member.getTrip().getId())
                .tripTitle(member.getTrip().getTitle())
                .userId(member.getUser().getId())
                .username(member.getUser().getUsername())
                .status(member.getStatus())
                .joinedAt(member.getJoinedAt())
                .updatedAt(member.getUpdatedAt())
                .build();
    }
}
