package com.tasknest.dto;

import jakarta.validation.constraints.NotBlank;

public class TaskListRequest {

    private Long userId;

    @NotBlank(message = "Task list name is required")
    private String name;

    public TaskListRequest() {
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}