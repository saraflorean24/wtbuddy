package com.wtbuddy.wtbuddy.entity;

import com.wtbuddy.wtbuddy.enums.FeedbackCategory;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "feedback")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private FeedbackCategory category;

    @Column(name = "rating", nullable = false)
    private Integer rating;

    @ElementCollection
    @CollectionTable(name = "feedback_topics", joinColumns = @JoinColumn(name = "feedback_id"))
    @Column(name = "topic")
    private List<String> topics;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
