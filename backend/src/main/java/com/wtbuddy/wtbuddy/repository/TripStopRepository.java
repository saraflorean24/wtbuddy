package com.wtbuddy.wtbuddy.repository;

import com.wtbuddy.wtbuddy.entity.TripStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TripStopRepository extends JpaRepository<TripStop, Long> {
    List<TripStop> findByTripIdOrderByOrderIndex(Long tripId);
}