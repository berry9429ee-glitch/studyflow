package com.studyflow.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ItemRequest {

    @NotBlank(message = "{content.required}")
    @Size(max = 200, message = "{content.size}")
    private String content;

    @Min(value = 0)
    private Integer sortOrder;
}
