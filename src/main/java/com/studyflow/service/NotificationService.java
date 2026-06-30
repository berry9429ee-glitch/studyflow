package com.studyflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.studyflow.dto.mapper.StudyFlowMapper;
import com.studyflow.dto.response.NotificationResponse;
import com.studyflow.entity.Notification;
import com.studyflow.entity.Plan;
import com.studyflow.exception.BusinessException;
import com.studyflow.exception.ErrorCode;
import com.studyflow.mapper.NotificationMapper;
import com.studyflow.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;

    private final NotificationMapper notificationMapper;
    private final StudyFlowMapper studyFlowMapper;

    public List<NotificationResponse> listNotifications(Boolean read, Integer limit) {
        Long userId = SecurityUtil.getCurrentUserId();
        int safeLimit = Math.min(Math.max(limit == null ? DEFAULT_LIMIT : limit, 1), MAX_LIMIT);
        LambdaQueryWrapper<Notification> wrapper = new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .orderByAsc(Notification::getReadStatus)
                .orderByDesc(Notification::getCreatedAt)
                .orderByDesc(Notification::getId);
        if (read != null) {
            wrapper.eq(Notification::getReadStatus, read);
        }
        IPage<Notification> page = notificationMapper.selectPage(new Page<>(1, safeLimit), wrapper);
        return studyFlowMapper.toNotificationResponses(page.getRecords());
    }

    public Long countUnread() {
        Long userId = SecurityUtil.getCurrentUserId();
        return notificationMapper.selectCount(new LambdaQueryWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .eq(Notification::getReadStatus, false));
    }

    @Transactional
    public NotificationResponse markRead(Long id) {
        Long userId = SecurityUtil.getCurrentUserId();
        Notification notification = ensureOwnedNotification(id, userId);
        if (!Boolean.TRUE.equals(notification.getReadStatus())) {
            Notification update = new Notification();
            update.setId(id);
            update.setReadStatus(true);
            update.setReadAt(LocalDateTime.now());
            notificationMapper.updateById(update);
        }
        return studyFlowMapper.toNotificationResponse(notificationMapper.selectById(id));
    }

    @Transactional
    public int markAllRead() {
        Long userId = SecurityUtil.getCurrentUserId();
        return notificationMapper.update(null, new LambdaUpdateWrapper<Notification>()
                .eq(Notification::getUserId, userId)
                .eq(Notification::getReadStatus, false)
                .set(Notification::getReadStatus, true)
                .set(Notification::getReadAt, LocalDateTime.now()));
    }

    @Transactional
    public boolean createPlanReminderIfAbsent(Plan plan, String type, String title, String message, LocalDate triggerDate) {
        if (plan == null || plan.getId() == null || plan.getUserId() == null || !StringUtils.hasText(type)) {
            return false;
        }
        Long existing = notificationMapper.selectCount(new LambdaQueryWrapper<Notification>()
                .eq(Notification::getPlanId, plan.getId())
                .eq(Notification::getType, type)
                .eq(Notification::getTriggerDate, triggerDate));
        if (existing > 0) {
            return false;
        }

        Notification notification = new Notification();
        notification.setUserId(plan.getUserId());
        notification.setPlanId(plan.getId());
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setReadStatus(false);
        notification.setTriggerDate(triggerDate);
        try {
            notificationMapper.insert(notification);
            return true;
        } catch (DuplicateKeyException exception) {
            return false;
        }
    }

    private Notification ensureOwnedNotification(Long id, Long userId) {
        Notification notification = notificationMapper.selectById(id);
        if (notification == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "通知不存在");
        }
        if (!notification.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "不能访问他人的通知");
        }
        return notification;
    }
}
