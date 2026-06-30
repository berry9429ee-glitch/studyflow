package com.studyflow.service;

import com.studyflow.entity.Plan;
import com.studyflow.mapper.PlanMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlanReminderServiceTest {

    @Mock
    private PlanMapper planMapper;

    @Mock
    private NotificationService notificationService;

    private PlanReminderService planReminderService;

    @BeforeEach
    void setUp() {
        planReminderService = new PlanReminderService(planMapper, notificationService);
        ReflectionTestUtils.setField(planReminderService, "dueSoonDays", 2);
        ReflectionTestUtils.setField(planReminderService, "reminderEnabled", true);
    }

    @Test
    void scanDuePlansCreatesOverdueAndDueSoonNotifications() {
        LocalDate today = LocalDate.now();
        Plan overdue = plan(1L, "Redis 缓存设计", today.minusDays(1));
        Plan dueSoon = plan(2L, "算法每日练习", today.plusDays(2));
        when(planMapper.selectList(any())).thenReturn(List.of(overdue, dueSoon));
        when(notificationService.createPlanReminderIfAbsent(any(), anyString(), anyString(), anyString(), any()))
                .thenReturn(true);

        int created = planReminderService.scanDuePlanRemindersForUser(2L);

        assertThat(created).isEqualTo(2);
        verify(notificationService).createPlanReminderIfAbsent(eq(overdue), eq("OVERDUE"), anyString(), anyString(), eq(overdue.getDueDate()));
        verify(notificationService).createPlanReminderIfAbsent(eq(dueSoon), eq("DUE_SOON"), anyString(), anyString(), eq(dueSoon.getDueDate()));
    }

    private Plan plan(Long id, String title, LocalDate dueDate) {
        Plan plan = new Plan();
        plan.setId(id);
        plan.setUserId(2L);
        plan.setTitle(title);
        plan.setStatus("TODO");
        plan.setDueDate(dueDate);
        return plan;
    }
}
