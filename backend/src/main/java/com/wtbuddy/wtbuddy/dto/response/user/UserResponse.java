package com.wtbuddy.wtbuddy.dto.response.user;

import com.wtbuddy.wtbuddy.enums.Role;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String email;
    private String username;
    private Role role;
    private Boolean isActive;
    private LocalDateTime createdAt;
}