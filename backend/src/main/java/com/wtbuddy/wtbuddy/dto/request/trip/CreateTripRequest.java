package com.wtbuddy.wtbuddy.dto.request.trip;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDate;

@Data
public class CreateTripRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isPublic = false;
    private Integer maxMembers;
}
