package com.studyflow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserResponse {

    private Long id;
    private String username;
    private String email;
    private String avatarColor;
    private String role;
    private LocalDateTime createdAt;
}
