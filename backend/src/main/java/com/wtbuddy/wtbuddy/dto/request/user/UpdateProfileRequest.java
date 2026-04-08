package com.wtbuddy.wtbuddy.dto.request.user;

import com.wtbuddy.wtbuddy.enums.JobType;
import lombok.Data;
import java.time.LocalDate;

@Data
public class UpdateProfileRequest {
    private String fullName;
    private String bio;
    private String jobCity;
    private String jobState;
    private JobType jobType;
    private LocalDate programStart;
    private LocalDate programEnd;
    private String profilePhotoUrl;
}