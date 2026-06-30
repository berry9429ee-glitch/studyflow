package com.studyflow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.studyflow.entity.PlanItem;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface PlanItemMapper extends BaseMapper<PlanItem> {

    List<PlanItem> selectByPlanId(@Param("planId") Long planId);

    Integer selectMaxSortOrder(@Param("planId") Long planId);

    int markAllDone(@Param("planId") Long planId);
}
