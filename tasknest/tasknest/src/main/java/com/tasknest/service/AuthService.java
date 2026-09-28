package com.tasknest.service;

import com.tasknest.dto.LoginRequest;
import com.tasknest.dto.LoginResponse;
import com.tasknest.entity.User;
import com.tasknest.exception.InvalidCredentialsException;
import com.tasknest.repository.UserRepository;
import com.tasknest.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException();
        }

        return new LoginResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                "Login successful",
                jwtService.generateToken(user)
        );
    }
}