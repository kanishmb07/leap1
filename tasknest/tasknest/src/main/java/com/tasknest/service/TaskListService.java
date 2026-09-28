package com.tasknest.service;

import com.tasknest.entity.TaskList;
import com.tasknest.entity.User;
import com.tasknest.exception.ResourceNotFoundException;
import com.tasknest.repository.TaskListRepository;
import com.tasknest.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskListService {

    private final TaskListRepository taskListRepository;
    private final UserRepository userRepository;

    public TaskListService(TaskListRepository taskListRepository,
                           UserRepository userRepository) {
        this.taskListRepository = taskListRepository;
        this.userRepository = userRepository;
    }

    public TaskList createTaskList(Long userId, String name) {

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        TaskList taskList = new TaskList();
        taskList.setName(name);
        taskList.setUser(user);

        return taskListRepository.save(taskList);
    }

    public List<TaskList> getTaskListsByUser(Long userId) {
        return taskListRepository.findByUserId(userId);
    }

    public TaskList getTaskListForUser(Long taskListId, Long userId) {
        return taskListRepository.findByIdAndUserId(taskListId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Task list not found for this user"));
    }

    public TaskList updateTaskList(Long taskListId, Long userId, String name) {
        TaskList taskList = getTaskListForUser(taskListId, userId);
        taskList.setName(name);
        return taskListRepository.save(taskList);
    }

    public void deleteTaskList(Long taskListId, Long userId) {
        TaskList taskList = getTaskListForUser(taskListId, userId);
        taskListRepository.delete(taskList);
    }
}