package com.wtbuddy.wtbuddy.repository;

import com.wtbuddy.wtbuddy.entity.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    Page<Event> findByOrganizerId(Long organizerId, Pageable pageable);
    Page<Event> findByEventDateAfter(LocalDateTime date, Pageable pageable);
    Page<Event> findByTitleContainingIgnoreCase(String title, Pageable pageable);
}