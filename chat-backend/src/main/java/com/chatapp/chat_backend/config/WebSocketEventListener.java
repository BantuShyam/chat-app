package com.chatapp.chat_backend.config;

import com.chatapp.chat_backend.service.UserSessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.security.Principal;

@Component
public class WebSocketEventListener {

    @Autowired
    private UserSessionService userSessionService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleConnect(SessionConnectedEvent event) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();

        System.out.println("=== CONNECT EVENT === Principal: " + (principal != null ? principal.getName() : "NULL"));

        if (principal != null) {
            userSessionService.addUser(principal.getName());
            System.out.println("Online users now: " + userSessionService.getOnlineUsers());
            broadcastOnlineUsers();
        }
    }

    @EventListener
    public void handleSubscribe(SessionSubscribeEvent event) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String destination = accessor.getDestination();
        Principal principal = accessor.getUser();

        System.out.println("=== SUBSCRIBE EVENT === destination: " + destination + " principal: " + (principal != null ? principal.getName() : "NULL"));

        if ("/topic/online-users".equals(destination) && principal != null) {
            messagingTemplate.convertAndSendToUser(
                    principal.getName(),
                    "/queue/online-users-init",
                    userSessionService.getOnlineUsers()
            );
            System.out.println("Sent initial online-users snapshot to " + principal.getName());
        }
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();

        if (principal != null) {
            userSessionService.removeUser(principal.getName());
            broadcastOnlineUsers();
        }
    }

    private void broadcastOnlineUsers() {
        messagingTemplate.convertAndSend("/topic/online-users", userSessionService.getOnlineUsers());
    }
}