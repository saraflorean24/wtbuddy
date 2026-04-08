package com.wtbuddy.wtbuddy.service;

import com.wtbuddy.wtbuddy.dto.request.trip.CreateTripRequest;
import com.wtbuddy.wtbuddy.dto.request.trip.UpdateTripRequest;
import com.wtbuddy.wtbuddy.dto.response.trip.TripResponse;
import com.wtbuddy.wtbuddy.entity.Trip;
import com.wtbuddy.wtbuddy.entity.User;
import com.wtbuddy.wtbuddy.enums.TripStatus;
import com.wtbuddy.wtbuddy.exception.ResourceNotFoundException;
import com.wtbuddy.wtbuddy.exception.UnauthorizedException;
import com.wtbuddy.wtbuddy.repository.TripRepository;
import com.wtbuddy.wtbuddy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final UserRepository userRepository;

    @Transactional
    public TripResponse createTrip(CreateTripRequest request, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Trip trip = Trip.builder()
                .user(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(TripStatus.DRAFT)
                .isPublic(request.getIsPublic() != null ? request.getIsPublic() : false)
                .maxMembers(request.getMaxMembers())
                .build();

        tripRepository.save(trip);
        return mapToResponse(trip);
    }

    public Page<TripResponse> getAllPublicTrips(Pageable pageable) {
        return tripRepository.findByIsPublicTrue(pageable).map(this::mapToResponse);
    }

    public Page<TripResponse> searchTrips(String title, Pageable pageable) {
        return tripRepository.findByTitleContainingIgnoreCase(title, pageable)
                .map(this::mapToResponse);
    }

    public Page<TripResponse> getTripsByUser(Long userId, Pageable pageable) {
        return tripRepository.findByUserId(userId, pageable).map(this::mapToResponse);
    }

    public TripResponse getTripById(Long id) {
        Trip trip = tripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + id));
        return mapToResponse(trip);
    }

    @Transactional
    public TripResponse updateTrip(Long id, UpdateTripRequest request, String email) {
        Trip trip = tripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + id));

        if (!trip.getUser().getEmail().equals(email)) {
            throw new UnauthorizedException("You are not the owner of this trip");
        }

        if (request.getTitle() != null) trip.setTitle(request.getTitle());
        if (request.getDescription() != null) trip.setDescription(request.getDescription());
        if (request.getStartDate() != null) trip.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) trip.setEndDate(request.getEndDate());
        if (request.getStatus() != null) trip.setStatus(request.getStatus());
        if (request.getIsPublic() != null) trip.setIsPublic(request.getIsPublic());
        if (request.getMaxMembers() != null) trip.setMaxMembers(request.getMaxMembers());

        tripRepository.save(trip);
        return mapToResponse(trip);
    }

    @Transactional
    public void deleteTrip(Long id, String email) {
        Trip trip = tripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + id));

        if (!trip.getUser().getEmail().equals(email)) {
            throw new UnauthorizedException("You are not the owner of this trip");
        }

        tripRepository.delete(trip);
    }

    private TripResponse mapToResponse(Trip trip) {
        return TripResponse.builder()
                .id(trip.getId())
                .userId(trip.getUser().getId())
                .username(trip.getUser().getUsername())
                .title(trip.getTitle())
                .description(trip.getDescription())
                .startDate(trip.getStartDate())
                .endDate(trip.getEndDate())
                .status(trip.getStatus())
                .isPublic(trip.getIsPublic())
                .maxMembers(trip.getMaxMembers())
                .createdAt(trip.getCreatedAt())
                .build();
    }
}