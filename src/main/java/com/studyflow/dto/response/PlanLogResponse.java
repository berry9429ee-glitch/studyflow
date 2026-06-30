package com.studyflow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PlanLogResponse {

    private Long id;
    private Long planId;
    private String action;
    private String detail;
    private LocalDateTime createdAt;
}
