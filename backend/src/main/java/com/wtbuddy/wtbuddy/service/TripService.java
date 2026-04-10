package com.wtbuddy.wtbuddy.service;

import com.wtbuddy.wtbuddy.dto.request.trip.CreateTripRequest;
import com.wtbuddy.wtbuddy.dto.request.trip.CreateTripStopRequest;
import com.wtbuddy.wtbuddy.dto.request.trip.UpdateTripRequest;
import com.wtbuddy.wtbuddy.dto.response.trip.TripResponse;
import com.wtbuddy.wtbuddy.dto.response.trip.TripStopResponse;
import com.wtbuddy.wtbuddy.entity.Trip;
import com.wtbuddy.wtbuddy.entity.TripStop;
import com.wtbuddy.wtbuddy.entity.User;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import com.wtbuddy.wtbuddy.enums.TripMemberStatus;
import com.wtbuddy.wtbuddy.enums.TripStatus;
import com.wtbuddy.wtbuddy.exception.ResourceNotFoundException;
import com.wtbuddy.wtbuddy.exception.UnauthorizedException;
import com.wtbuddy.wtbuddy.repository.TripMemberRepository;
import com.wtbuddy.wtbuddy.repository.TripRepository;
import com.wtbuddy.wtbuddy.repository.TripStopRepository;
import com.wtbuddy.wtbuddy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final TripMemberRepository tripMemberRepository;
    private final TripStopRepository tripStopRepository;

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

    public Page<TripResponse> searchPublicTrips(String title, Pageable pageable) {
        return tripRepository.findByTitleContainingIgnoreCaseAndIsPublicTrue(title, pageable)
                .map(this::mapToResponse);
    }

    public Page<TripResponse> getMyTrips(String email, String search, Pageable pageable) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (search != null && !search.isEmpty()) {
            return tripRepository.findByUserIdAndTitleContainingIgnoreCase(user.getId(), search, pageable)
                    .map(this::mapToResponse);
        }
        return tripRepository.findByUserId(user.getId(), pageable).map(this::mapToResponse);
    }

    public Page<TripResponse> getTripsByUser(Long userId, Pageable pageable) {
        return tripRepository.findByUserId(userId, pageable).map(this::mapToResponse);
    }

    public TripResponse getTripById(Long id) {
        Trip trip = tripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + id));
        return mapToResponse(trip);
    }

    public List<TripStopResponse> getStopsForTrip(Long tripId) {
        tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + tripId));
        return tripStopRepository.findByTripIdOrderByOrderIndex(tripId)
                .stream()
                .map(stop -> TripStopResponse.builder()
                        .id(stop.getId())
                        .orderIndex(stop.getOrderIndex())
                        .dayNumber(stop.getDayNumber())
                        .city(stop.getCity())
                        .country(stop.getCountry())
                        .address(stop.getAddress())
                        .notes(stop.getNotes())
                        .lat(stop.getStopLocation() != null ? stop.getStopLocation().getY() : null)
                        .lng(stop.getStopLocation() != null ? stop.getStopLocation().getX() : null)
                        .build())
                .toList();
    }

    @Transactional
    public List<TripStopResponse> replaceStops(Long tripId, List<CreateTripStopRequest> requests, String email) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + tripId));

        if (!trip.getUser().getEmail().equals(email)) {
            throw new UnauthorizedException("You are not the owner of this trip");
        }

        tripStopRepository.deleteAll(tripStopRepository.findByTripIdOrderByOrderIndex(tripId));

        GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

        List<TripStop> newStops = requests.stream()
                .map(req -> {
                    Point point = null;
                    if (req.getLat() != null && req.getLng() != null) {
                        point = geometryFactory.createPoint(new Coordinate(req.getLng(), req.getLat()));
                        point.setSRID(4326);
                    }
                    return TripStop.builder()
                            .trip(trip)
                            .city(req.getCity())
                            .country(req.getCountry())
                            .address(req.getAddress())
                            .notes(req.getNotes())
                            .dayNumber(req.getDayNumber())
                            .orderIndex(req.getOrderIndex())
                            .stopLocation(point)
                            .build();
                })
                .toList();

        tripStopRepository.saveAll(newStops);

        return newStops.stream()
                .map(stop -> TripStopResponse.builder()
                        .id(stop.getId())
                        .orderIndex(stop.getOrderIndex())
                        .dayNumber(stop.getDayNumber())
                        .city(stop.getCity())
                        .country(stop.getCountry())
                        .address(stop.getAddress())
                        .notes(stop.getNotes())
                        .lat(stop.getStopLocation() != null ? stop.getStopLocation().getY() : null)
                        .lng(stop.getStopLocation() != null ? stop.getStopLocation().getX() : null)
                        .build())
                .toList();
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
        int memberCount = (int) tripMemberRepository.countByTripIdAndStatus(
                trip.getId(), TripMemberStatus.ACCEPTED);
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
                .memberCount(memberCount)
                .createdAt(trip.getCreatedAt())
                .build();
    }
}
