package com.wtbuddy.wtbuddy.dto.response.user;

import com.wtbuddy.wtbuddy.enums.JobType;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;

@Data
@Builder
public class UserProfileResponse {
    private Long id;
    private Long userId;
    private String fullName;
    private String bio;
    private String jobCity;
    private String jobState;
    private JobType jobType;
    private LocalDate programStart;
    private LocalDate programEnd;
    private String profilePhotoUrl;
}