package com.studyflow.service;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.studyflow.dto.mapper.StudyFlowMapper;
import com.studyflow.entity.Plan;
import com.studyflow.entity.User;
import com.studyflow.exception.BusinessException;
import com.studyflow.mapper.PlanItemMapper;
import com.studyflow.mapper.PlanLogMapper;
import com.studyflow.mapper.PlanMapper;
import com.studyflow.security.LoginUser;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings({"unchecked", "rawtypes"})
class PlanServiceTest {

    @Mock
    private PlanMapper planMapper;

    @Mock
    private PlanItemMapper planItemMapper;

    @Mock
    private PlanLogMapper planLogMapper;

    @Mock
    private StudyFlowMapper studyFlowMapper;

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    private PlanService planService;

    @BeforeEach
    void setUp() {
        planService = new PlanService(planMapper, planItemMapper, planLogMapper, studyFlowMapper, stringRedisTemplate);
        User user = new User();
        user.setId(2L);
        user.setUsername("demo");
        user.setPassword("encoded");
        user.setRole("USER");
        LoginUser loginUser = new LoginUser(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(loginUser, null, loginUser.getAuthorities())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void ensureOwnedPlanRejectsOtherUsersPlan() {
        Plan plan = new Plan();
        plan.setId(10L);
        plan.setUserId(99L);
        when(planMapper.selectById(10L)).thenReturn(plan);

        assertThatThrownBy(() -> planService.ensureOwnedPlan(10L, 2L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("不能访问他人的计划");
    }

    @Test
    void recalculateProgressMarksPlanDoneWhenAllItemsDone() {
        Plan plan = new Plan();
        plan.setId(10L);
        plan.setStatus("IN_PROGRESS");
        when(planItemMapper.selectCount(any(Wrapper.class))).thenReturn(2L, 2L);
        when(planMapper.selectById(10L)).thenReturn(plan);

        int progress = planService.recalculateProgressAndStatus(10L);

        ArgumentCaptor<Plan> captor = ArgumentCaptor.forClass(Plan.class);
        verify(planMapper).updateById(captor.capture());
        assertThat(progress).isEqualTo(100);
        assertThat(captor.getValue().getProgress()).isEqualTo(100);
        assertThat(captor.getValue().getStatus()).isEqualTo("DONE");
    }

    @Test
    void listPlansCapsPageSizeAtOneHundred() {
        when(planMapper.selectUserPlanPage(any(Page.class), eq(2L), isNull(), isNull(), isNull()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(studyFlowMapper.toPlanResponses(any())).thenReturn(List.of());

        planService.listPlans(1, 1000, null, null, null);

        ArgumentCaptor<Page<Plan>> captor = ArgumentCaptor.forClass(Page.class);
        verify(planMapper).selectUserPlanPage(captor.capture(), eq(2L), isNull(), isNull(), isNull());
        assertThat(captor.getValue().getSize()).isEqualTo(100);
    }

    @Test
    void updateStatusCanonicalizesPartialPlanToInProgress() {
        Plan plan = new Plan();
        plan.setId(10L);
        plan.setUserId(2L);
        plan.setStatus("TODO");
        when(planMapper.selectById(10L)).thenReturn(plan);
        when(planItemMapper.selectCount(any(Wrapper.class))).thenReturn(2L, 1L);

        planService.updateStatus(10L, "TODO");

        ArgumentCaptor<Plan> captor = ArgumentCaptor.forClass(Plan.class);
        verify(planMapper, org.mockito.Mockito.atLeast(2)).updateById(captor.capture());
        Plan progressUpdate = captor.getAllValues().stream()
                .filter(value -> value.getProgress() != null)
                .findFirst()
                .orElseThrow();
        assertThat(progressUpdate.getProgress()).isEqualTo(50);
        assertThat(progressUpdate.getStatus()).isEqualTo("IN_PROGRESS");
    }
}
