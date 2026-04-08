package com.wtbuddy.wtbuddy.dto.response.event;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class EventResponse {
    private Long id;
    private Long organizerId;
    private String organizerUsername;
    private String title;
    private String description;
    private String location;
    private LocalDateTime eventDate;
    private Integer maxParticipants;
    private LocalDateTime createdAt;
}
