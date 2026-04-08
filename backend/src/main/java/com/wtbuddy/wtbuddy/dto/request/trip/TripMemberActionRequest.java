package com.wtbuddy.wtbuddy.dto.request.trip;

import com.wtbuddy.wtbuddy.enums.TripMemberStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TripMemberActionRequest {

    @NotNull(message = "Status is required")
    private TripMemberStatus status;
}