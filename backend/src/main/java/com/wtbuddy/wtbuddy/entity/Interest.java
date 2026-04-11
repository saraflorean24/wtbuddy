package com.wtbuddy.wtbuddy.entity;

import com.wtbuddy.wtbuddy.enums.InterestCategory;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "interest")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Interest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 50)
    private InterestCategory category;
}