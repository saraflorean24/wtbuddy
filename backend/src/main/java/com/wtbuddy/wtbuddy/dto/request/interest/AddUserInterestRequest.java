package com.wtbuddy.wtbuddy.dto.request.interest;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AddUserInterestRequest {

    @NotNull(message = "Interest ID is required")
    private Long interestId;
}