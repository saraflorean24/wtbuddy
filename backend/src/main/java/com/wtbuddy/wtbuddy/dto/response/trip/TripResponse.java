package com.wtbuddy.wtbuddy.dto.response.trip;

import com.wtbuddy.wtbuddy.enums.TripStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class TripResponse {
    private Long id;
    private Long userId;
    private String username;
    private String title;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private TripStatus status;
    private Boolean isPublic;
    private Integer maxMembers;
    private LocalDateTime createdAt;
}