package com.chatapp.chat_backend.config;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;

public class CustomHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(
            ServerHttpRequest request,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {

        String username = null;
        if (request instanceof ServletServerHttpRequest servletRequest) {
            username = servletRequest.getServletRequest().getParameter("username");
        }

        final String finalUsername = (username != null) ? username : "anon-" + System.currentTimeMillis();

        return () -> finalUsername;
    }
}