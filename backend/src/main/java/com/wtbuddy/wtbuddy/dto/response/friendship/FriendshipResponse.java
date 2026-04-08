package com.wtbuddy.wtbuddy.dto.response.friendship;

import com.wtbuddy.wtbuddy.enums.FriendshipStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class FriendshipResponse {
    private Long id;
    private Long requesterId;
    private String requesterUsername;
    private Long addresseeId;
    private String addresseeUsername;
    private FriendshipStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}