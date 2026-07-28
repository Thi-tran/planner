package com.planner.domain;

public record ChecklistSummaryResponse(
        int totalChecklists,
        int totalTasks,
        int completedTasks,
        int overdueTasks
) {
}
