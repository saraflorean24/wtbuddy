package com.wtbuddy.wtbuddy.dto.request.interest;

import com.wtbuddy.wtbuddy.enums.InterestCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateInterestRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "Category is required")
    private InterestCategory category;
}
