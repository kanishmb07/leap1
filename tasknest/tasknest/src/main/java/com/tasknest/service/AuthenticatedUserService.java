package com.tasknest.service;

import com.tasknest.security.AuthenticatedUser;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuthenticatedUserService {

    public AuthenticatedUser getCurrentUser() {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
            throw new AccessDeniedException("Authentication is required");
        }
        return user;
    }

    public Long getCurrentUserId() {
        return getCurrentUser().id();
    }

    public void requireCurrentUser(Long requestedUserId) {
        if (!getCurrentUserId().equals(requestedUserId)) {
            throw new AccessDeniedException("Access denied");
        }
    }
}