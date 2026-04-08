package com.wtbuddy.wtbuddy.dto.response.interest;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InterestResponse {
    private Long id;
    private String name;
    private String category;
}