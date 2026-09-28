package com.tasknest.controller;

import com.tasknest.dto.TaskListRequest;
import com.tasknest.dto.TaskListResponse;
import com.tasknest.entity.TaskList;
import com.tasknest.service.AuthenticatedUserService;
import com.tasknest.service.TaskListService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/task-lists")
public class TaskListController {

    private final TaskListService taskListService;
    private final AuthenticatedUserService authenticatedUserService;

    public TaskListController(TaskListService taskListService,
                              AuthenticatedUserService authenticatedUserService) {
        this.taskListService = taskListService;
        this.authenticatedUserService = authenticatedUserService;
    }

    @PostMapping
    public ResponseEntity<TaskListResponse> createTaskList(
            @Valid @RequestBody TaskListRequest request) {

        TaskList taskList = taskListService.createTaskList(
                authenticatedUserService.getCurrentUserId(),
                request.getName()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(toTaskListResponse(taskList));
    }

    @PutMapping("/{taskListId}")
    public ResponseEntity<TaskListResponse> updateTaskList(
            @PathVariable Long taskListId,
            @Valid @RequestBody TaskListRequest request) {

        TaskList taskList = taskListService.updateTaskList(
                taskListId,
                authenticatedUserService.getCurrentUserId(),
                request.getName()
        );

        return ResponseEntity.ok(toTaskListResponse(taskList));
    }

    @DeleteMapping("/{taskListId}")
    public ResponseEntity<Void> deleteTaskList(
            @PathVariable Long taskListId) {

        taskListService.deleteTaskList(
                taskListId, authenticatedUserService.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<TaskListResponse>> getTaskListsByUser(
            @PathVariable Long userId) {

        authenticatedUserService.requireCurrentUser(userId);

        return ResponseEntity.ok(
                taskListService.getTaskListsByUser(
                                authenticatedUserService.getCurrentUserId()).stream()
                        .map(this::toTaskListResponse)
                        .collect(Collectors.toList())
        );
    }

    private TaskListResponse toTaskListResponse(TaskList taskList) {
        return new TaskListResponse(
                taskList.getId(),
                taskList.getName(),
                taskList.getUser().getId()
        );
    }
}