package com.studyflow.dto.response;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class NotificationResponse {

    private Long id;
    private Long userId;
    private Long planId;
    private String type;
    private String title;
    private String message;
    private Boolean read;
    private LocalDate triggerDate;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
}
