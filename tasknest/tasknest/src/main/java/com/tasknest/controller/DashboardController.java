package com.tasknest.controller;

import com.tasknest.dto.DashboardResponse;
import com.tasknest.service.AuthenticatedUserService;
import com.tasknest.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final AuthenticatedUserService authenticatedUserService;

    public DashboardController(DashboardService dashboardService,
                               AuthenticatedUserService authenticatedUserService) {
        this.dashboardService = dashboardService;
        this.authenticatedUserService = authenticatedUserService;
    }

    @GetMapping
    public ResponseEntity<DashboardResponse> getCurrentUserDashboard() {
        return ResponseEntity.ok(dashboardService.getDashboard(
                authenticatedUserService.getCurrentUserId()));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<DashboardResponse> getDashboard(
            @PathVariable Long userId) {
        authenticatedUserService.requireCurrentUser(userId);
        return ResponseEntity.ok(dashboardService.getDashboard(
                authenticatedUserService.getCurrentUserId()));
    }
}