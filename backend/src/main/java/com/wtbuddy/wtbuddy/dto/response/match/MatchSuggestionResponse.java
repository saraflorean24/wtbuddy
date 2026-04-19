package com.wtbuddy.wtbuddy.dto.response.match;

import com.wtbuddy.wtbuddy.enums.JobType;
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
    private String profilePhotoUrl;
    private JobType jobType;
    private String jobCity;
    private Float compatibilityScore;
    private String reason;
    private Boolean isDismissed;
    private LocalDateTime createdAt;
}