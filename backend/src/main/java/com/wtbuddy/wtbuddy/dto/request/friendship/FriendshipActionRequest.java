package com.wtbuddy.wtbuddy.dto.request.friendship;

import com.wtbuddy.wtbuddy.enums.FriendshipStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FriendshipActionRequest {

    @NotNull(message = "Status is required")
    private FriendshipStatus status;
}
