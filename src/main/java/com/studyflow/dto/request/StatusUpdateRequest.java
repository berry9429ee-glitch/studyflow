package com.studyflow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class StatusUpdateRequest {

    @NotBlank(message = "{status.required}")
    @Pattern(regexp = "TODO|IN_PROGRESS|DONE", message = "{status.invalid}")
    private String status;
}
