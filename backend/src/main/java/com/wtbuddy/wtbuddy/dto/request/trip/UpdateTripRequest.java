package com.wtbuddy.wtbuddy.dto.request.trip;

import com.wtbuddy.wtbuddy.enums.TripStatus;
import lombok.Data;
import java.time.LocalDate;

@Data
public class UpdateTripRequest {
    private String title;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private TripStatus status;
    private Boolean isPublic;
    private Integer maxMembers;
}