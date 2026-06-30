package com.studyflow.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studyflow.dto.response.DashboardStatsResponse;
import com.studyflow.entity.Plan;
import com.studyflow.mapper.PlanLogMapper;
import com.studyflow.mapper.PlanMapper;
import com.studyflow.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final PlanMapper planMapper;
    private final PlanLogMapper planLogMapper;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    public DashboardStatsResponse getStats() {
        Long userId = SecurityUtil.getCurrentUserId();
        String key = "dashboard:stats:" + userId;
        DashboardStatsResponse cached = readCache(key);
        if (cached != null) {
            return cached;
        }

        DashboardStatsResponse stats = computeStats(userId);
        writeCache(key, stats);
        return stats;
    }

    private DashboardStatsResponse computeStats(Long userId) {
        Long total = countByStatus(userId, null);
        Long todo = countByStatus(userId, "TODO");
        Long inProgress = countByStatus(userId, "IN_PROGRESS");
        Long done = countByStatus(userId, "DONE");
        Long overdue = planMapper.selectCount(new LambdaQueryWrapper<Plan>()
                .eq(Plan::getUserId, userId)
                .lt(Plan::getDueDate, LocalDate.now())
                .ne(Plan::getStatus, "DONE"));
        int completionRate = total == 0 ? 0 : (int) Math.round(done * 100.0 / total);

        DashboardStatsResponse response = new DashboardStatsResponse();
        response.setTotalPlans(total);
        response.setTodoCount(todo);
        response.setInProgressCount(inProgress);
        response.setDoneCount(done);
        response.setCompletionRate(completionRate);
        response.setOverdueCount(overdue);
        response.setWeeklyDone(buildWeeklyDone(userId));
        response.setCategoryStats(buildCategoryStats(userId));
        return response;
    }

    private Long countByStatus(Long userId, String status) {
        LambdaQueryWrapper<Plan> wrapper = new LambdaQueryWrapper<Plan>().eq(Plan::getUserId, userId);
        if (status != null) {
            wrapper.eq(Plan::getStatus, status);
        }
        return planMapper.selectCount(wrapper);
    }

    private List<DashboardStatsResponse.WeeklyDone> buildWeeklyDone(Long userId) {
        List<Map<String, Object>> rows = planLogMapper.selectWeeklyDone(userId);
        Map<String, Long> counts = new HashMap<>();
        for (Map<String, Object> row : rows) {
            String date = String.valueOf(row.get("date"));
            counts.put(date, toLong(row.get("count")));
        }

        LocalDate start = LocalDate.now().minusDays(6);
        return start.datesUntil(LocalDate.now().plusDays(1))
                .map(date -> new DashboardStatsResponse.WeeklyDone(date.toString(), counts.getOrDefault(date.toString(), 0L)))
                .toList();
    }

    private List<DashboardStatsResponse.CategoryStat> buildCategoryStats(Long userId) {
        return planMapper.selectCategoryStats(userId)
                .stream()
                .map(row -> new DashboardStatsResponse.CategoryStat(
                        String.valueOf(row.get("category")),
                        toLong(row.get("count"))
                ))
                .toList();
    }

    private DashboardStatsResponse readCache(String key) {
        try {
            String payload = stringRedisTemplate.opsForValue().get(key);
            if (payload == null) {
                return null;
            }
            return objectMapper.readValue(payload, DashboardStatsResponse.class);
        } catch (Exception exception) {
            log.info("Dashboard cache read skipped: {}", exception.getMessage());
            return null;
        }
    }

    private void writeCache(String key, DashboardStatsResponse stats) {
        try {
            stringRedisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(stats), Duration.ofMinutes(5).toMillis(), TimeUnit.MILLISECONDS);
        } catch (JsonProcessingException exception) {
            log.info("Dashboard cache serialization skipped: {}", exception.getMessage());
        } catch (Exception exception) {
            log.info("Dashboard cache write skipped: {}", exception.getMessage());
        }
    }

    private Long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }
}
