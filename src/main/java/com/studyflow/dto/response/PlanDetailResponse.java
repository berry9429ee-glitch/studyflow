package com.studyflow.dto.response;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
public class PlanDetailResponse {

    private Long id;
    private String title;
    private String description;
    private String category;
    private String status;
    private Integer priority;
    private LocalDate dueDate;
    private Integer progress;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PlanItemResponse> items = new ArrayList<>();
    private List<PlanLogResponse> logs = new ArrayList<>();
}
