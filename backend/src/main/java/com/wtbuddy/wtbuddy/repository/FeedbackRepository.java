package com.wtbuddy.wtbuddy.repository;

import com.wtbuddy.wtbuddy.entity.Feedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    @Query("""
    SELECT f FROM Feedback f
    JOIN FETCH f.user
    LEFT JOIN FETCH f.topics
    WHERE f.user.id = :userId
    """)
    Page<Feedback> findByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query(
            value = """
        SELECT DISTINCT f FROM Feedback f
        JOIN FETCH f.user
        LEFT JOIN FETCH f.topics
        WHERE f.message IS NOT NULL AND f.message <> ''
      """,
            countQuery = """
        SELECT COUNT(f) FROM Feedback f
        WHERE f.message IS NOT NULL AND f.message <> ''
      """
    )
    Page<Feedback> findRecentWithMessage(Pageable pageable);

    @Query(
            value = "SELECT DISTINCT f FROM Feedback f JOIN FETCH f.user LEFT JOIN FETCH f.topics",
            countQuery = "SELECT COUNT(f) FROM Feedback f"
    )
    Page<Feedback> findAllWithDetails(Pageable pageable);
}
