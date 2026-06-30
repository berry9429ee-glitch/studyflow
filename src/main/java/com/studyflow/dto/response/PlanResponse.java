package com.studyflow.dto.response;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class PlanResponse {

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
}
