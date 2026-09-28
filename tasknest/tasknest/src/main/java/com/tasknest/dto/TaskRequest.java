package com.tasknest.dto;

import com.tasknest.entity.Priority;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class TaskRequest {

    @NotNull(message = "Task list ID is required")
    private Long taskListId;

    @NotBlank(message = "Task title is required")
    private String title;

   @NotNull(message = "Due date is required")
private LocalDate dueDate;
    @NotNull(message = "Priority is required")
    private Priority priority;

    public TaskRequest() {
    }

    public Long getTaskListId() {
        return taskListId;
    }

    public void setTaskListId(Long taskListId) {
        this.taskListId = taskListId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }
}