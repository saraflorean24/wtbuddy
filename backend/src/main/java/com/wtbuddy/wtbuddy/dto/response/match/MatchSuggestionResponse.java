package com.wtbuddy.wtbuddy.dto.response.match;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class MatchSuggestionResponse {
    private Long id;
    private Long suggestedUserId;
    private String suggestedUsername;
    private String suggestedFullName;
    private Float compatibilityScore;
    private String reason;
    private Boolean isDismissed;
    private LocalDateTime createdAt;
}