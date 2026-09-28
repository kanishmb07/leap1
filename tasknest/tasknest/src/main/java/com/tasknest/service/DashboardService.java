package com.tasknest.service;

import com.tasknest.dto.DashboardResponse;
import com.tasknest.entity.Priority;
import com.tasknest.exception.ResourceNotFoundException;
import com.tasknest.repository.TaskRepository;
import com.tasknest.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class DashboardService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public DashboardService(TaskRepository taskRepository,
                            UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    public DashboardResponse getDashboard(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found");
        }

        long totalTasks = taskRepository.countByTaskListUserId(userId);
        long completedTasks = taskRepository
                .countByTaskListUserIdAndCompletedTrue(userId);
        long pendingTasks = taskRepository
                .countByTaskListUserIdAndCompletedFalse(userId);
        long overdueTasks = taskRepository
                .countByTaskListUserIdAndDueDateBeforeAndCompletedFalse(
                        userId, LocalDate.now());
        long highPriorityTasks = taskRepository
                .countByTaskListUserIdAndPriority(userId, Priority.HIGH);
        long mediumPriorityTasks = taskRepository
                .countByTaskListUserIdAndPriority(userId, Priority.MEDIUM);
        long lowPriorityTasks = taskRepository
                .countByTaskListUserIdAndPriority(userId, Priority.LOW);

        return new DashboardResponse(
                totalTasks,
                completedTasks,
                pendingTasks,
                overdueTasks,
                highPriorityTasks,
                mediumPriorityTasks,
                lowPriorityTasks
        );
    }
}