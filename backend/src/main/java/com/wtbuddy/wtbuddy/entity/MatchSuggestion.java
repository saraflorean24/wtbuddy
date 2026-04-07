package com.wtbuddy.wtbuddy.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "match_suggestion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchSuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "suggested_user_id", nullable = false)
    private User suggestedUser;

    @Column(name = "compatibility_score")
    private Float compatibilityScore;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "is_dismissed", nullable = false)
    private Boolean isDismissed = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isDismissed == null) isDismissed = false;
    }
}