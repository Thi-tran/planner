package com.planner.domain;

public record ProjectProgressResponse(
        int totalTasks,
        int completedTasks,
        int percentage,
        int tasksLeft
) {
}
