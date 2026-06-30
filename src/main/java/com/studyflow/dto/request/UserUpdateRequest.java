package com.studyflow.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UserUpdateRequest {

    @Email(message = "{email.invalid}")
    private String email;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "{avatar.invalid}")
    private String avatarColor;
}
