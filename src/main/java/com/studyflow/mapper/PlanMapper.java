package com.studyflow.mapper;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.studyflow.entity.Plan;
import org.apache.ibatis.annotations.Param;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import java.util.List;
import java.util.Map;

public interface PlanMapper extends BaseMapper<Plan> {

    IPage<Plan> selectUserPlanPage(Page<Plan> page,
                                   @Param("userId") Long userId,
                                   @Param("status") String status,
                                   @Param("category") String category,
                                   @Param("keyword") String keyword);

    List<Map<String, Object>> selectCategoryStats(@Param("userId") Long userId);
}
