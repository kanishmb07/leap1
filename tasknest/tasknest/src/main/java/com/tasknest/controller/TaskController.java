package com.tasknest.controller;

import com.tasknest.dto.TaskRequest;
import com.tasknest.dto.TaskResponse;
import com.tasknest.entity.Priority;
import com.tasknest.entity.Task;
import com.tasknest.service.AuthenticatedUserService;
import com.tasknest.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;
        private final AuthenticatedUserService authenticatedUserService;

        public TaskController(TaskService taskService,
                                                  AuthenticatedUserService authenticatedUserService) {
        this.taskService = taskService;
                this.authenticatedUserService = authenticatedUserService;
    }

    @PostMapping
        public ResponseEntity<TaskResponse> createTask(
                        @Valid @RequestBody TaskRequest request) {

        Task task = taskService.createTask(
                authenticatedUserService.getCurrentUserId(),
                request.getTaskListId(),
                request.getTitle(),
                request.getDueDate(),
                request.getPriority()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(toTaskResponse(task));
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<TaskResponse> updateTask(
            @PathVariable Long taskId,
            @Valid @RequestBody TaskRequest request) {

        Task task = taskService.updateTask(
                authenticatedUserService.getCurrentUserId(),
                taskId,
                request.getTaskListId(),
                request.getTitle(),
                request.getDueDate(),
                request.getPriority()
        );

        return ResponseEntity.ok(toTaskResponse(task));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long taskId) {
        taskService.deleteTask(
                authenticatedUserService.getCurrentUserId(), taskId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<TaskResponse>> searchTasks(
            @RequestParam String title) {

        return ResponseEntity.ok(
                taskService.searchTasks(
                                authenticatedUserService.getCurrentUserId(), title).stream()
                        .map(this::toTaskResponse)
                        .collect(Collectors.toList())
        );
    }

    @GetMapping("/filter")
    public ResponseEntity<List<TaskResponse>> filterByPriority(
            @RequestParam Priority priority) {

        return ResponseEntity.ok(
                taskService.filterByPriority(
                                authenticatedUserService.getCurrentUserId(), priority).stream()
                        .map(this::toTaskResponse)
                        .collect(Collectors.toList())
        );
    }

    @GetMapping("/list/{taskListId}")
    public ResponseEntity<List<TaskResponse>> getTasksByList(
            @PathVariable Long taskListId) {

        return ResponseEntity.ok(
                taskService.getTasksByList(
                                authenticatedUserService.getCurrentUserId(), taskListId).stream()
                        .map(this::toTaskResponse)
                        .collect(Collectors.toList())
        );
    }

    @GetMapping("/user/{userId}/list/{taskListId}")
    public ResponseEntity<List<TaskResponse>> getTasksByListForUser(
            @PathVariable Long userId,
            @PathVariable Long taskListId) {

        authenticatedUserService.requireCurrentUser(userId);

        return ResponseEntity.ok(
                taskService.getTasksByListForUser(
                                authenticatedUserService.getCurrentUserId(), taskListId).stream()
                        .map(this::toTaskResponse)
                        .collect(Collectors.toList())
        );
    }

    @PutMapping("/{taskId}/complete")
    public ResponseEntity<TaskResponse> markComplete(
            @PathVariable Long taskId) {

        return ResponseEntity.ok(
                toTaskResponse(taskService.markComplete(
                        authenticatedUserService.getCurrentUserId(), taskId))
        );
    }

    @PutMapping("/{taskId}/incomplete")
    public ResponseEntity<TaskResponse> markIncomplete(
            @PathVariable Long taskId) {

        return ResponseEntity.ok(
                toTaskResponse(taskService.markIncomplete(
                        authenticatedUserService.getCurrentUserId(), taskId))
        );
    }

    @GetMapping("/today")
    public ResponseEntity<List<TaskResponse>> getTodayTasks() {

        return ResponseEntity.ok(
                taskService.getTodayTasks(
                                authenticatedUserService.getCurrentUserId()).stream()
                        .map(this::toTaskResponse)
                        .collect(Collectors.toList())
        );
    }

    @GetMapping("/overdue")
    public ResponseEntity<List<TaskResponse>> getOverdueTasks() {

        return ResponseEntity.ok(
                taskService.getOverdueTasks(
                                authenticatedUserService.getCurrentUserId()).stream()
                        .map(this::toTaskResponse)
                        .collect(Collectors.toList())
        );
    }

    private TaskResponse toTaskResponse(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDueDate(),
                task.getPriority(),
                task.isCompleted(),
                task.getTaskList().getId()
        );
    }
}