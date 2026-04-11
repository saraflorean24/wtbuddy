package com.wtbuddy.wtbuddy.repository;

import com.wtbuddy.wtbuddy.entity.TripMember;
import com.wtbuddy.wtbuddy.enums.TripMemberStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TripMemberRepository extends JpaRepository<TripMember, Long> {
    List<TripMember> findByTripId(Long tripId);
    List<TripMember> findByUserId(Long userId);
    List<TripMember> findByTripIdAndStatus(Long tripId, TripMemberStatus status);
    Optional<TripMember> findByTripIdAndUserId(Long tripId, Long userId);
    boolean existsByTripIdAndUserId(Long tripId, Long userId);
    long countByTripIdAndStatus(Long tripId, TripMemberStatus status);
    List<TripMember> findByTripIdAndDeclinedByOwnerTrue(Long tripId);
}