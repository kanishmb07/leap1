package com.tasknest.service;

import com.tasknest.entity.Task;
import com.tasknest.entity.TaskList;
import com.tasknest.entity.Priority;
import com.tasknest.exception.ResourceNotFoundException;
import com.tasknest.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskListService taskListService;

    public TaskService(TaskRepository taskRepository,
                       TaskListService taskListService) {
        this.taskRepository = taskRepository;
        this.taskListService = taskListService;
    }

    public Task createTask(Long userId,
                           Long taskListId,
                           String title,
                           LocalDate dueDate,
                           Priority priority) {

        TaskList taskList = taskListService.getTaskListForUser(taskListId, userId);

        Task task = new Task();
        task.setTitle(title);
        task.setDueDate(dueDate);
        task.setPriority(priority);
        task.setCompleted(false);
        task.setTaskList(taskList);

        return taskRepository.save(task);
    }

    public Task updateTask(Long userId, Long taskId, Long taskListId, String title,
                           LocalDate dueDate, Priority priority) {
        Task task = getTaskForUser(taskId, userId);

        TaskList taskList = taskListService.getTaskListForUser(taskListId, userId);

        if (!task.getTaskList().getId().equals(taskList.getId())) {
            throw new ResourceNotFoundException(
                    "Task not found in the specified task list");
        }

        task.setTitle(title);
        task.setDueDate(dueDate);
        task.setPriority(priority);

        return taskRepository.save(task);
    }

    public void deleteTask(Long userId, Long taskId) {
        Task task = getTaskForUser(taskId, userId);
        taskRepository.delete(task);
    }

    public List<Task> getTasksByList(Long userId, Long taskListId) {
        taskListService.getTaskListForUser(taskListId, userId);
        return taskRepository.findByTaskListId(taskListId);
    }

    public List<Task> getTasksByListForUser(Long userId, Long taskListId) {
        return getTasksByList(userId, taskListId);
    }

    public List<Task> searchTasks(Long userId, String title) {
        return taskRepository.findByTaskListUserIdAndTitleContainingIgnoreCase(
                userId, title);
    }

    public List<Task> filterByPriority(Long userId, Priority priority) {
        return taskRepository.findByTaskListUserIdAndPriority(userId, priority);
    }

    public Task markComplete(Long userId, Long taskId) {
        Task task = getTaskForUser(taskId, userId);
        task.setCompleted(true);
        return taskRepository.save(task);
    }

    public Task markIncomplete(Long userId, Long taskId) {
        Task task = getTaskForUser(taskId, userId);
        task.setCompleted(false);
        return taskRepository.save(task);
    }

    public Task getTaskForUser(Long taskId, Long userId) {
        return taskRepository.findByIdAndTaskListUserId(taskId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Task not found for this user"));
    }

    public List<Task> getTodayTasks(Long userId) {
        return taskRepository.findByTaskListUserIdAndDueDate(
                userId, LocalDate.now());
    }

    public List<Task> getOverdueTasks(Long userId) {
        return taskRepository.findByTaskListUserIdAndDueDateBeforeAndCompletedFalse(
                userId, LocalDate.now());
    }
}