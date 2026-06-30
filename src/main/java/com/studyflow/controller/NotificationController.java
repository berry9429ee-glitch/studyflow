package com.studyflow.controller;

import com.studyflow.dto.response.ApiResponse;
import com.studyflow.dto.response.NotificationResponse;
import com.studyflow.service.NotificationService;
import com.studyflow.service.PlanReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final PlanReminderService planReminderService;

    @GetMapping
    public ApiResponse<List<NotificationResponse>> listNotifications(@RequestParam(required = false) Boolean read,
                                                                      @RequestParam(defaultValue = "20") Integer limit) {
        return ApiResponse.ok(notificationService.listNotifications(read, limit));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Long> unreadCount() {
        return ApiResponse.ok(notificationService.countUnread());
    }

    @PatchMapping("/{id}/read")
    public ApiResponse<NotificationResponse> markRead(@PathVariable Long id) {
        return ApiResponse.ok(notificationService.markRead(id));
    }

    @PatchMapping("/read-all")
    public ApiResponse<Integer> markAllRead() {
        return ApiResponse.ok(notificationService.markAllRead());
    }

    @PostMapping("/scan")
    public ApiResponse<Integer> scanCurrentUserDuePlans() {
        return ApiResponse.ok(planReminderService.scanCurrentUserDuePlans());
    }
}
