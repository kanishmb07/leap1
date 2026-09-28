package com.tasknest.repository;

import com.tasknest.entity.TaskList;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskListRepository extends JpaRepository<TaskList, Long> {

    List<TaskList> findByUserId(Long userId);

    Optional<TaskList> findByIdAndUserId(Long taskListId, Long userId);
}