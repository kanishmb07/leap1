package com.tasknest.repository;

import com.tasknest.entity.Task;
import com.tasknest.entity.Priority;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByTaskListId(Long taskListId);

        List<Task> findByTaskListUserIdAndTitleContainingIgnoreCase(
            Long userId, String title);

        List<Task> findByTaskListUserIdAndPriority(Long userId, Priority priority);

        List<Task> findByTaskListUserIdAndDueDate(Long userId, LocalDate dueDate);

        List<Task> findByTaskListUserIdAndDueDateBeforeAndCompletedFalse(
            Long userId, LocalDate dueDate);

    Optional<Task> findByIdAndTaskListUserId(Long taskId, Long userId);

    List<Task> findByTitleContainingIgnoreCase(String title);

    List<Task> findByPriority(Priority priority);

    long countByTaskListUserIdAndPriority(Long userId, Priority priority);

        long countByTaskListUserId(Long userId);

        long countByTaskListUserIdAndCompletedTrue(Long userId);

        long countByTaskListUserIdAndCompletedFalse(Long userId);

        long countByTaskListUserIdAndDueDateBeforeAndCompletedFalse(
            Long userId, LocalDate date);

    List<Task> findByDueDate(LocalDate dueDate);

    List<Task> findByDueDateBeforeAndCompletedFalse(LocalDate date);
}