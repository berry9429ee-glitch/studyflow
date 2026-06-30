package com.studyflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.studyflow.dto.mapper.StudyFlowMapper;
import com.studyflow.dto.request.ItemRequest;
import com.studyflow.dto.request.ReorderRequest;
import com.studyflow.dto.response.ItemToggleResponse;
import com.studyflow.dto.response.PlanItemResponse;
import com.studyflow.entity.Plan;
import com.studyflow.entity.PlanItem;
import com.studyflow.exception.BusinessException;
import com.studyflow.exception.ErrorCode;
import com.studyflow.mapper.PlanItemMapper;
import com.studyflow.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ItemService {

    private final PlanItemMapper planItemMapper;
    private final PlanService planService;
    private final StudyFlowMapper studyFlowMapper;

    @Transactional
    public PlanItemResponse addItem(Long planId, ItemRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        planService.ensureOwnedPlan(planId, userId);

        Integer maxOrder = planItemMapper.selectMaxSortOrder(planId);
        PlanItem item = new PlanItem();
        item.setPlanId(planId);
        item.setContent(request.getContent().trim());
        item.setDone(false);
        item.setSortOrder(request.getSortOrder() == null ? maxOrder + 1 : request.getSortOrder());
        planItemMapper.insert(item);

        planService.recalculateProgressAndStatus(planId);
        planService.recordLog(planId, userId, "ITEM_ADDED", "新增任务：" + item.getContent());
        planService.evictDashboardStats(userId);
        log.info("Added item {} to plan {}", item.getId(), planId);
        return studyFlowMapper.toPlanItemResponse(item);
    }

    @Transactional
    public ItemToggleResponse toggleItem(Long itemId) {
        Long userId = SecurityUtil.getCurrentUserId();
        PlanItem item = findItem(itemId);
        Plan plan = planService.ensureOwnedPlan(item.getPlanId(), userId);

        boolean nextDone = !Boolean.TRUE.equals(item.getDone());
        PlanItem update = new PlanItem();
        update.setId(itemId);
        update.setDone(nextDone);
        planItemMapper.updateById(update);

        item.setDone(nextDone);
        int progress = planService.recalculateProgressAndStatus(plan.getId());
        String action = nextDone ? "ITEM_DONE" : "ITEM_REOPENED";
        String detail = (nextDone ? "完成任务：" : "重新打开任务：") + item.getContent();
        planService.recordLog(plan.getId(), userId, action, detail);
        planService.evictDashboardStats(userId);
        log.info("Toggled item {} to {} for plan {}", itemId, nextDone, plan.getId());
        return new ItemToggleResponse(studyFlowMapper.toPlanItemResponse(item), progress);
    }

    @Transactional
    public void deleteItem(Long itemId) {
        Long userId = SecurityUtil.getCurrentUserId();
        PlanItem item = findItem(itemId);
        planService.ensureOwnedPlan(item.getPlanId(), userId);
        planItemMapper.deleteById(itemId);
        planService.recalculateProgressAndStatus(item.getPlanId());
        planService.recordLog(item.getPlanId(), userId, "ITEM_DELETED", "删除任务：" + item.getContent());
        planService.evictDashboardStats(userId);
        log.info("Deleted item {}", itemId);
    }

    @Transactional
    public PlanItemResponse reorderItem(Long itemId, ReorderRequest request) {
        Long userId = SecurityUtil.getCurrentUserId();
        PlanItem item = findItem(itemId);
        planService.ensureOwnedPlan(item.getPlanId(), userId);

        PlanItem update = new PlanItem();
        update.setId(itemId);
        update.setSortOrder(request.getSortOrder());
        planItemMapper.updateById(update);

        PlanItem updated = findItem(itemId);
        planService.recordLog(item.getPlanId(), userId, "ITEM_REORDERED", "调整任务顺序：" + updated.getContent());
        planService.evictDashboardStats(userId);
        log.info("Reordered item {} to {}", itemId, request.getSortOrder());
        return studyFlowMapper.toPlanItemResponse(updated);
    }

    private PlanItem findItem(Long itemId) {
        PlanItem item = planItemMapper.selectOne(new LambdaQueryWrapper<PlanItem>().eq(PlanItem::getId, itemId));
        if (item == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "任务不存在");
        }
        return item;
    }
}
