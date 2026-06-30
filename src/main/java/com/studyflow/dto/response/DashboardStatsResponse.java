package com.studyflow.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {

    private Long totalPlans;
    private Long todoCount;
    private Long inProgressCount;
    private Long doneCount;
    private Integer completionRate;
    private Long overdueCount;
    private List<WeeklyDone> weeklyDone = new ArrayList<>();
    private List<CategoryStat> categoryStats = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyDone {
        private String date;
        private Long count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryStat {
        private String category;
        private Long count;
    }
}
