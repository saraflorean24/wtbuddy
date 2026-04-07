package com.wtbuddy.wtbuddy.repository;

import com.wtbuddy.wtbuddy.entity.MatchSuggestion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface MatchSuggestionRepository extends JpaRepository<MatchSuggestion, Long> {
    Page<MatchSuggestion> findByUserIdAndIsDismissedFalse(Long userId, Pageable pageable);
    Optional<MatchSuggestion> findByUserIdAndSuggestedUserId(Long userId, Long suggestedUserId);
    boolean existsByUserIdAndSuggestedUserId(Long userId, Long suggestedUserId);
}