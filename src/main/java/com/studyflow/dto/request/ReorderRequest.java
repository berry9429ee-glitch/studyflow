package com.studyflow.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReorderRequest {

    @NotNull
    @Min(value = 0)
    private Integer sortOrder;
}
