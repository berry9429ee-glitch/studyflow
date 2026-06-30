package com.studyflow.controller;

import com.studyflow.dto.request.ItemRequest;
import com.studyflow.dto.request.ReorderRequest;
import com.studyflow.dto.response.ApiResponse;
import com.studyflow.dto.response.ItemToggleResponse;
import com.studyflow.dto.response.PlanItemResponse;
import com.studyflow.service.ItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @PostMapping("/api/plans/{planId}/items")
    public ApiResponse<PlanItemResponse> addItem(@PathVariable Long planId,
                                                 @Valid @RequestBody ItemRequest request) {
        return ApiResponse.ok(itemService.addItem(planId, request));
    }

    @PatchMapping("/api/items/{id}/toggle")
    public ApiResponse<ItemToggleResponse> toggleItem(@PathVariable Long id) {
        return ApiResponse.ok(itemService.toggleItem(id));
    }

    @DeleteMapping("/api/items/{id}")
    public ApiResponse<Void> deleteItem(@PathVariable Long id) {
        itemService.deleteItem(id);
        return ApiResponse.ok();
    }

    @PatchMapping("/api/items/{id}/reorder")
    public ApiResponse<PlanItemResponse> reorderItem(@PathVariable Long id,
                                                     @Valid @RequestBody ReorderRequest request) {
        return ApiResponse.ok(itemService.reorderItem(id, request));
    }
}
