package com.studyflow.controller;

import com.studyflow.dto.request.PlanCreateRequest;
import com.studyflow.dto.request.PlanUpdateRequest;
import com.studyflow.dto.request.StatusUpdateRequest;
import com.studyflow.dto.response.ApiResponse;
import com.studyflow.dto.response.PageResponse;
import com.studyflow.dto.response.PlanDetailResponse;
import com.studyflow.dto.response.PlanResponse;
import com.studyflow.service.PlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/plans")
public class PlanController {

    private final PlanService planService;

    @GetMapping
    public ApiResponse<PageResponse<PlanResponse>> listPlans(@RequestParam(defaultValue = "1") Long page,
                                                             @RequestParam(defaultValue = "10") Long size,
                                                             @RequestParam(required = false) String status,
                                                             @RequestParam(required = false) String category,
                                                             @RequestParam(required = false) String keyword) {
        return ApiResponse.ok(planService.listPlans(page, size, status, category, keyword));
    }

    @GetMapping("/{id}")
    public ApiResponse<PlanDetailResponse> getPlan(@PathVariable Long id) {
        return ApiResponse.ok(planService.getPlanDetail(id));
    }

    @PostMapping
    public ApiResponse<PlanResponse> createPlan(@Valid @RequestBody PlanCreateRequest request) {
        return ApiResponse.ok(planService.createPlan(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<PlanResponse> updatePlan(@PathVariable Long id,
                                                @Valid @RequestBody PlanUpdateRequest request) {
        return ApiResponse.ok(planService.updatePlan(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deletePlan(@PathVariable Long id) {
        planService.deletePlan(id);
        return ApiResponse.ok();
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<PlanResponse> updateStatus(@PathVariable Long id,
                                                  @Valid @RequestBody StatusUpdateRequest request) {
        return ApiResponse.ok(planService.updateStatus(id, request.getStatus()));
    }
}
