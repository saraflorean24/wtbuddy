package com.wtbuddy.wtbuddy.dto.request.event;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UpdateEventRequest {
    private String title;
    private String description;
    private String location;
    private LocalDateTime eventDate;
    private Integer maxParticipants;
}
