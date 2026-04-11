package com.wtbuddy.wtbuddy.dto.response.event;

import com.wtbuddy.wtbuddy.enums.ParticipantStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class EventParticipantResponse {
    private Long id;
    private Long userId;
    private String username;
    private ParticipantStatus status;
    private Boolean declinedByOwner;
    private LocalDateTime joinedAt;
}
