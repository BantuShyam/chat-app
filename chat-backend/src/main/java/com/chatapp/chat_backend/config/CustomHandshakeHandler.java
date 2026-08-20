package com.chatapp.chat_backend.config;

import com.chatapp.chat_backend.config.JwtUtil;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;

public class CustomHandshakeHandler extends DefaultHandshakeHandler {

    private final JwtUtil jwtUtil;

    public CustomHandshakeHandler(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected Principal determineUser(
            ServerHttpRequest request,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {

        String token = null;

        if (request instanceof ServletServerHttpRequest servletRequest) {
            token = servletRequest.getServletRequest().getParameter("token");
        }

        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Missing token in WebSocket handshake");
        }

        if (!jwtUtil.isTokenValid(token)) {
            throw new IllegalArgumentException("Invalid or expired token in WebSocket handshake");
        }

        String username = jwtUtil.extractUsername(token);

        return () -> username;
    }
}