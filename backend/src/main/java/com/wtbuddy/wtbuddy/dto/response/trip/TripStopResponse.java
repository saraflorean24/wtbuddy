package com.wtbuddy.wtbuddy.dto.response.trip;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TripStopResponse {
    private Long id;
    private Integer orderIndex;
    private Integer dayNumber;
    private String city;
    private String country;
    private String address;
    private String notes;
    private Double lat;
    private Double lng;
}
