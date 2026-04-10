package com.wtbuddy.wtbuddy.dto.request.feedback;

import com.wtbuddy.wtbuddy.enums.FeedbackCategory;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;

@Data
public class CreateFeedbackRequest {

    @NotNull
    private FeedbackCategory category;

    @NotNull
    @Min(1) @Max(5)
    private Integer rating;

    private List<String> topics;

    @Size(max = 2000)
    private String message;
}