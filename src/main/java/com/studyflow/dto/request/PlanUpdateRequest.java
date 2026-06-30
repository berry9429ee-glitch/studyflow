package com.studyflow.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class PlanUpdateRequest {

    @Size(max = 100, message = "{title.size}")
    private String title;

    private String description;

    private String category;

    @Min(value = 1, message = "{priority.range}")
    @Max(value = 3, message = "{priority.range}")
    private Integer priority;

    private LocalDate dueDate;

    private List<@Size(max = 200, message = "{content.size}") String> items;
}
