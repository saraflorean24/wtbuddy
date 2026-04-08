package com.wtbuddy.wtbuddy.dto.response.notification;

import com.wtbuddy.wtbuddy.enums.NotificationType;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private String message;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
