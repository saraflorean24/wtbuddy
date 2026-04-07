package com.wtbuddy.wtbuddy.repository;

import com.wtbuddy.wtbuddy.entity.Trip;
import com.wtbuddy.wtbuddy.enums.TripStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {
    Page<Trip> findByUserId(Long userId, Pageable pageable);
    Page<Trip> findByIsPublicTrue(Pageable pageable);
    Page<Trip> findByUserIdAndStatus(Long userId, TripStatus status, Pageable pageable);
    Page<Trip> findByTitleContainingIgnoreCase(String title, Pageable pageable);
}