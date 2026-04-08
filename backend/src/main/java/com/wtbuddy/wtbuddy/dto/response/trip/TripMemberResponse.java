package com.wtbuddy.wtbuddy.dto.response.trip;

import com.wtbuddy.wtbuddy.enums.TripMemberStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class TripMemberResponse {
    private Long id;
    private Long tripId;
    private String tripTitle;
    private Long userId;
    private String username;
    private TripMemberStatus status;
    private LocalDateTime joinedAt;
    private LocalDateTime updatedAt;
}