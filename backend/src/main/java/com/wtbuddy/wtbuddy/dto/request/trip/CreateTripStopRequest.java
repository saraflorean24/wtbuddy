package com.wtbuddy.wtbuddy.dto.request.trip;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateTripStopRequest {

    @NotBlank(message = "City is required")
    private String city;

    @NotBlank(message = "Country is required")
    private String country;

    private String address;
    private String notes;

    @NotNull(message = "Day number is required")
    private Integer dayNumber;

    @NotNull(message = "Order index is required")
    private Integer orderIndex;

    private Double lat;
    private Double lng;
}
