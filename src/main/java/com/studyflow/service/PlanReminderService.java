package com.studyflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.studyflow.entity.Plan;
import com.studyflow.mapper.PlanMapper;
import com.studyflow.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlanReminderService {

    private final PlanMapper planMapper;
    private final NotificationService notificationService;

    @Value("${studyflow.reminder.enabled:true}")
    private boolean reminderEnabled;

    @Value("${studyflow.reminder.due-soon-days:1}")
    private int dueSoonDays;

    @Scheduled(cron = "${studyflow.reminder.scan-cron:0 0 8 * * *}", zone = "${studyflow.reminder.zone:Asia/Shanghai}")
    @Transactional
    public void scheduledScan() {
        if (!reminderEnabled) {
            return;
        }
        int created = scanDuePlanReminders(null);
        if (created > 0) {
            log.info("Created {} due plan notifications by scheduled scan", created);
        }
    }

    @Transactional
    public int scanCurrentUserDuePlans() {
        return scanDuePlanReminders(SecurityUtil.getCurrentUserId());
    }

    @Transactional
    public int scanDuePlanRemindersForUser(Long userId) {
        return scanDuePlanReminders(userId);
    }

    private int scanDuePlanReminders(Long userId) {
        LocalDate today = LocalDate.now();
        LocalDate windowEnd = today.plusDays(Math.max(dueSoonDays, 0));

        LambdaQueryWrapper<Plan> wrapper = new LambdaQueryWrapper<Plan>()
                .ne(Plan::getStatus, "DONE")
                .isNotNull(Plan::getDueDate)
                .le(Plan::getDueDate, windowEnd)
                .orderByAsc(Plan::getDueDate);
        if (userId != null) {
            wrapper.eq(Plan::getUserId, userId);
        }

        List<Plan> plans = planMapper.selectList(wrapper);
        int created = 0;
        for (Plan plan : plans) {
            ReminderPayload payload = buildPayload(plan, today);
            if (notificationService.createPlanReminderIfAbsent(
                    plan,
                    payload.type(),
                    payload.title(),
                    payload.message(),
                    plan.getDueDate())) {
                created++;
            }
        }
        return created;
    }

    private ReminderPayload buildPayload(Plan plan, LocalDate today) {
        long days = ChronoUnit.DAYS.between(today, plan.getDueDate());
        if (days < 0) {
            return new ReminderPayload(
                    "OVERDUE",
                    "计划已逾期",
                    "计划「" + plan.getTitle() + "」已逾期 " + Math.abs(days) + " 天，请及时调整或完成。"
            );
        }
        String dueText = days == 0 ? "今天截止" : days + " 天后截止";
        return new ReminderPayload(
                "DUE_SOON",
                "计划即将到期",
                "计划「" + plan.getTitle() + "」" + dueText + "，建议优先处理。"
        );
    }

    private record ReminderPayload(String type, String title, String message) {
    }
}
