package com.wtbuddy.wtbuddy.dto.response.feedback;

import com.wtbuddy.wtbuddy.enums.FeedbackCategory;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class FeedbackResponse {
    private Long id;
    private Long userId;
    private String username;
    private FeedbackCategory category;
    private Integer rating;
    private List<String> topics;
    private String message;
    private LocalDateTime createdAt;
}
