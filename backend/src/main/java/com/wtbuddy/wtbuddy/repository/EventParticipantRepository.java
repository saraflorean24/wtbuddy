package com.wtbuddy.wtbuddy.repository;

import com.wtbuddy.wtbuddy.entity.EventParticipant;
import com.wtbuddy.wtbuddy.enums.ParticipantStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EventParticipantRepository extends JpaRepository<EventParticipant, Long> {
    List<EventParticipant> findByEventId(Long eventId);
    List<EventParticipant> findByUserId(Long userId);
    List<EventParticipant> findByEventIdAndStatus(Long eventId, ParticipantStatus status);
    Optional<EventParticipant> findByEventIdAndUserId(Long eventId, Long userId);
    boolean existsByEventIdAndUserId(Long eventId, Long userId);
    Optional<EventParticipant> findByQrCodeToken(String qrCodeToken);
    long countByEventId(Long eventId);
}