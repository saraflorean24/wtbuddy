package com.wtbuddy.wtbuddy.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_interest")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserInterest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "interest_id", nullable = false)
    private Interest interest;
}