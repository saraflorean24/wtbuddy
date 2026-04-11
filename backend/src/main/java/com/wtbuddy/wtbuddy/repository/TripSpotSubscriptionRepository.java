package com.wtbuddy.wtbuddy.repository;

import com.wtbuddy.wtbuddy.entity.TripSpotSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TripSpotSubscriptionRepository extends JpaRepository<TripSpotSubscription, Long> {
    Optional<TripSpotSubscription> findByTripIdAndUserId(Long tripId, Long userId);
    boolean existsByTripIdAndUserId(Long tripId, Long userId);

    @Query("SELECT s FROM TripSpotSubscription s JOIN FETCH s.user WHERE s.trip.id = :tripId")
    List<TripSpotSubscription> findByTripIdWithUser(@Param("tripId") Long tripId);

    List<TripSpotSubscription> findByTripId(Long tripId);
    void deleteByTripIdAndUserId(Long tripId, Long userId);
}
