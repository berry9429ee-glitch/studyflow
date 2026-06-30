package com.studyflow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PlanItemResponse {

    private Long id;
    private Long planId;
    private String content;
    private Boolean done;
    private Integer sortOrder;
    private LocalDateTime createdAt;
}
