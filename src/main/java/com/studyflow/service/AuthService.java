package com.studyflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.studyflow.dto.request.LoginRequest;
import com.studyflow.dto.request.RegisterRequest;
import com.studyflow.dto.response.AuthResponse;
import com.studyflow.entity.User;
import com.studyflow.exception.BusinessException;
import com.studyflow.exception.ErrorCode;
import com.studyflow.mapper.UserMapper;
import com.studyflow.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = request.getUsername().trim();
        boolean usernameExists = userMapper.selectCount(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, username)) > 0;
        if (usernameExists) {
            throw new BusinessException(ErrorCode.CONFLICT, "用户名已存在");
        }

        String email = StringUtils.hasText(request.getEmail()) ? request.getEmail().trim() : null;
        if (StringUtils.hasText(email)) {
            boolean emailExists = userMapper.selectCount(new LambdaQueryWrapper<User>()
                    .eq(User::getEmail, email)) > 0;
            if (emailExists) {
                throw new BusinessException(ErrorCode.CONFLICT, "邮箱已被使用");
            }
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setAvatarColor("#5b7cf6");
        user.setRole("USER");
        userMapper.insert(user);

        log.info("Registered new user: {}", username);
        return new AuthResponse(jwtUtil.generateToken(user), user.getUsername(), user.getRole());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, request.getUsername().trim()));
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "用户名或密码错误");
        }

        log.info("User logged in: {}", user.getUsername());
        return new AuthResponse(jwtUtil.generateToken(user), user.getUsername(), user.getRole());
    }
}
