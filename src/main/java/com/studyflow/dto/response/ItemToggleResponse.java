package com.studyflow.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ItemToggleResponse {

    private PlanItemResponse item;
    private Integer planProgress;
}
