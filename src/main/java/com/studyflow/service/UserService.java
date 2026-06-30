package com.studyflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.studyflow.dto.mapper.StudyFlowMapper;
import com.studyflow.dto.request.UserUpdateRequest;
import com.studyflow.dto.response.UserResponse;
import com.studyflow.entity.User;
import com.studyflow.exception.BusinessException;
import com.studyflow.exception.ErrorCode;
import com.studyflow.mapper.UserMapper;
import com.studyflow.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final StudyFlowMapper studyFlowMapper;

    public UserResponse getMe() {
        User user = userMapper.selectById(SecurityUtil.getCurrentUserId());
        if (user == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return studyFlowMapper.toUserResponse(user);
    }

    @Transactional
    public UserResponse updateMe(UserUpdateRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        User current = userMapper.selectById(userId);
        if (current == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        String email = StringUtils.hasText(request.getEmail()) ? request.getEmail().trim() : null;
        if (email != null && !email.equals(current.getEmail())) {
            boolean emailExists = userMapper.selectCount(new LambdaQueryWrapper<User>()
                    .eq(User::getEmail, email)
                    .ne(User::getId, userId)) > 0;
            if (emailExists) {
                throw new BusinessException(ErrorCode.CONFLICT, "邮箱已被使用");
            }
        }

        User update = new User();
        update.setId(userId);
        if (request.getEmail() != null) {
            update.setEmail(email);
        }
        if (request.getAvatarColor() != null) {
            update.setAvatarColor(request.getAvatarColor());
        }
        userMapper.updateById(update);
        log.info("Updated profile for user {}", current.getUsername());
        return studyFlowMapper.toUserResponse(userMapper.selectById(userId));
    }
}
