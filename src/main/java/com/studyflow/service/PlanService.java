package com.studyflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.studyflow.dto.mapper.StudyFlowMapper;
import com.studyflow.dto.request.PlanCreateRequest;
import com.studyflow.dto.request.PlanUpdateRequest;
import com.studyflow.dto.response.PageResponse;
import com.studyflow.dto.response.PlanDetailResponse;
import com.studyflow.dto.response.PlanResponse;
import com.studyflow.entity.Plan;
import com.studyflow.entity.PlanItem;
import com.studyflow.entity.PlanLog;
import com.studyflow.exception.BusinessException;
import com.studyflow.exception.ErrorCode;
import com.studyflow.mapper.PlanItemMapper;
import com.studyflow.mapper.PlanLogMapper;
import com.studyflow.mapper.PlanMapper;
import com.studyflow.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlanService {

    private static final Set<String> STATUSES = Set.of("TODO", "IN_PROGRESS", "DONE");

    private final PlanMapper planMapper;
    private final PlanItemMapper planItemMapper;
    private final PlanLogMapper planLogMapper;
    private final StudyFlowMapper studyFlowMapper;
    private final StringRedisTemplate stringRedisTemplate;

    public PageResponse<PlanResponse> listPlans(long page, long size, String status, String category, String keyword) {
        Long userId = SecurityUtil.getCurrentUserId();
        String normalizedStatus = StringUtils.hasText(status) ? status : null;
        if (normalizedStatus != null && !STATUSES.contains(normalizedStatus)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "状态参数无效");
        }
        Page<Plan> pageRequest = new Page<>(Math.max(page, 1), Math.max(size, 1));
        IPage<Plan> result = planMapper.selectUserPlanPage(
                pageRequest,
                userId,
                normalizedStatus,
                trimToNull(category),
                trimToNull(keyword)
        );
        return new PageResponse<>(
                studyFlowMapper.toPlanResponses(result.getRecords()),
                result.getTotal(),
                result.getCurrent(),
                result.getSize()
        );
    }

    public PlanDetailResponse getPlanDetail(Long id) {
        Long userId = SecurityUtil.getCurrentUserId();
        Plan plan = ensureOwnedPlan(id, userId);
        List<PlanItem> items = planItemMapper.selectByPlanId(id);
        List<PlanLog> logs = planLogMapper.selectRecentByPlanId(id, 10);
        return studyFlowMapper.toPlanDetailResponse(plan, items, logs);
    }

    @Transactional
    public PlanResponse createPlan(PlanCreateRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        Plan plan = new Plan();
        plan.setUserId(userId);
        plan.setTitle(request.getTitle().trim());
        plan.setDescription(request.getDescription());
        plan.setCategory(trimToNull(request.getCategory()));
        plan.setStatus("TODO");
        plan.setPriority(request.getPriority() == null ? 2 : request.getPriority());
        plan.setDueDate(request.getDueDate());
        plan.setProgress(0);
        planMapper.insert(plan);

        insertItems(plan.getId(), request.getItems());
        recalculateProgressAndStatus(plan.getId());
        recordLog(plan.getId(), userId, "CREATED", "创建计划：" + plan.getTitle());
        evictDashboardStats(userId);

        log.info("Created plan {} for user {}", plan.getId(), userId);
        return studyFlowMapper.toPlanResponse(planMapper.selectById(plan.getId()));
    }

    @Transactional
    public PlanResponse updatePlan(Long id, PlanUpdateRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        Plan existing = ensureOwnedPlan(id, userId);

        Plan update = new Plan();
        update.setId(id);
        if (StringUtils.hasText(request.getTitle())) {
            update.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null) {
            update.setDescription(request.getDescription());
        }
        if (request.getCategory() != null) {
            update.setCategory(trimToNull(request.getCategory()));
        }
        if (request.getPriority() != null) {
            update.setPriority(request.getPriority());
        }
        if (request.getDueDate() != null) {
            update.setDueDate(request.getDueDate());
        }
        planMapper.updateById(update);

        if (request.getItems() != null) {
            planItemMapper.delete(new LambdaQueryWrapper<PlanItem>().eq(PlanItem::getPlanId, id));
            insertItems(id, request.getItems());
            recalculateProgressAndStatus(id);
        }

        String title = StringUtils.hasText(update.getTitle()) ? update.getTitle() : existing.getTitle();
        recordLog(id, userId, "UPDATED", "更新计划：" + title);
        evictDashboardStats(userId);
        log.info("Updated plan {} for user {}", id, userId);
        return studyFlowMapper.toPlanResponse(planMapper.selectById(id));
    }

    @Transactional
    public void deletePlan(Long id) {
        Long userId = SecurityUtil.getCurrentUserId();
        Plan plan = ensureOwnedPlan(id, userId);
        recordLog(id, userId, "DELETED", "删除计划：" + plan.getTitle());
        planItemMapper.delete(new LambdaQueryWrapper<PlanItem>().eq(PlanItem::getPlanId, id));
        planMapper.deleteById(id);
        evictDashboardStats(userId);
        log.info("Deleted plan {} for user {}", id, userId);
    }

    @Transactional
    public PlanResponse updateStatus(Long id, String status) {
        if (!STATUSES.contains(status)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "状态参数无效");
        }
        Long userId = SecurityUtil.getCurrentUserId();
        ensureOwnedPlan(id, userId);

        if ("DONE".equals(status)) {
            planItemMapper.markAllDone(id);
        }
        Plan update = new Plan();
        update.setId(id);
        update.setStatus(status);
        planMapper.updateById(update);

        if ("DONE".equals(status)) {
            recalculateProgressAndStatus(id);
            Long totalItems = planItemMapper.selectCount(new LambdaQueryWrapper<PlanItem>().eq(PlanItem::getPlanId, id));
            if (totalItems == 0) {
                Plan doneWithoutItems = new Plan();
                doneWithoutItems.setId(id);
                doneWithoutItems.setProgress(100);
                doneWithoutItems.setStatus("DONE");
                planMapper.updateById(doneWithoutItems);
            }
        }

        String action = "DONE".equals(status) ? "STATUS_CHANGED_DONE" : "STATUS_CHANGED";
        recordLog(id, userId, action, "状态更新为：" + status);
        evictDashboardStats(userId);
        log.info("Updated plan {} status to {}", id, status);
        return studyFlowMapper.toPlanResponse(planMapper.selectById(id));
    }

    public Plan ensureOwnedPlan(Long planId, Long userId) {
        Plan plan = planMapper.selectById(planId);
        if (plan == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "计划不存在");
        }
        if (!plan.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "不能访问他人的计划");
        }
        return plan;
    }

    @Transactional
    public int recalculateProgressAndStatus(Long planId) {
        Long total = planItemMapper.selectCount(new LambdaQueryWrapper<PlanItem>().eq(PlanItem::getPlanId, planId));
        Long done = planItemMapper.selectCount(new LambdaQueryWrapper<PlanItem>()
                .eq(PlanItem::getPlanId, planId)
                .eq(PlanItem::getDone, true));
        int progress = total == 0 ? 0 : (int) Math.round(done * 100.0 / total);

        Plan plan = planMapper.selectById(planId);
        if (plan == null) {
            return progress;
        }

        String status = plan.getStatus();
        if (progress == 100 && total > 0) {
            status = "DONE";
        } else if (progress > 0 && progress < 100 && ("TODO".equals(status) || "DONE".equals(status))) {
            status = "IN_PROGRESS";
        } else if (progress == 0 && "DONE".equals(status)) {
            status = "TODO";
        }

        Plan update = new Plan();
        update.setId(planId);
        update.setProgress(progress);
        update.setStatus(status);
        planMapper.updateById(update);
        return progress;
    }

    public void recordLog(Long planId, Long userId, String action, String detail) {
        PlanLog logEntry = new PlanLog();
        logEntry.setPlanId(planId);
        logEntry.setUserId(userId);
        logEntry.setAction(action);
        logEntry.setDetail(detail);
        planLogMapper.insert(logEntry);
    }

    public void evictDashboardStats(Long userId) {
        try {
            stringRedisTemplate.delete("dashboard:stats:" + userId);
        } catch (Exception exception) {
            log.info("Dashboard cache eviction skipped for user {}: {}", userId, exception.getMessage());
        }
    }

    private void insertItems(Long planId, List<String> items) {
        if (items == null || items.isEmpty()) {
            return;
        }
        int order = 1;
        for (String content : items) {
            if (!StringUtils.hasText(content)) {
                continue;
            }
            PlanItem item = new PlanItem();
            item.setPlanId(planId);
            item.setContent(content.trim());
            item.setDone(false);
            item.setSortOrder(order++);
            planItemMapper.insert(item);
        }
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
