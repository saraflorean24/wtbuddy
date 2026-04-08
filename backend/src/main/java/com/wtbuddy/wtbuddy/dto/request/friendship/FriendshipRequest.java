package com.wtbuddy.wtbuddy.dto.request.friendship;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FriendshipRequest {

    @NotNull(message = "Addressee ID is required")
    private Long addresseeId;
}
