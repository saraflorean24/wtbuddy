package com.wtbuddy.wtbuddy.dto.request.interest;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateInterestRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String category;
}
