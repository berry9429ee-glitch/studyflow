package com.studyflow.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "{username.required}")
    @Size(min = 3, max = 50, message = "{username.size}")
    private String username;

    @NotBlank(message = "{password.required}")
    @Size(min = 6, message = "{password.size}")
    private String password;

    @Email(message = "{email.invalid}")
    private String email;
}
