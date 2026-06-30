package com.studyflow.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.studyflow.entity.PlanLog;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

public interface PlanLogMapper extends BaseMapper<PlanLog> {

    List<PlanLog> selectRecentByPlanId(@Param("planId") Long planId, @Param("limit") Integer limit);

    List<Map<String, Object>> selectWeeklyDone(@Param("userId") Long userId);
}
