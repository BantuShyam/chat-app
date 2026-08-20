package com.chatapp.chat_backend.config;

import com.chatapp.chat_backend.dto.MessageStatusUpdate;
import com.chatapp.chat_backend.model.ChatHistory;
import com.chatapp.chat_backend.model.MessageStatus;
import com.chatapp.chat_backend.repository.ChatHistoryRepository;
import com.chatapp.chat_backend.service.UserSessionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@Slf4j
public class WebSocketEventListener {

    @Autowired
    private UserSessionService userSessionService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatHistoryRepository chatHistoryRepository;

    @EventListener
    public void handleConnect(SessionConnectedEvent event) {

        Principal principal = event.getUser();

        SimpMessageHeaderAccessor accessor =
                SimpMessageHeaderAccessor.wrap(event.getMessage());

        String sessionId = accessor.getSessionId();

        if (principal != null && sessionId != null) {

            String username = principal.getName();

            userSessionService.addUser(sessionId, username);

            log.info("[CHAT] WebSocket connected for user: {}", username);

            deliverPendingMessages(username);
            broadcastOnlineUsers();
        }
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {

        SimpMessageHeaderAccessor accessor =
                SimpMessageHeaderAccessor.wrap(event.getMessage());

        String sessionId = accessor.getSessionId();

        if (sessionId != null) {
            userSessionService.removeUser(sessionId);
            broadcastOnlineUsers();
        }
    }

    private void broadcastOnlineUsers() {

        var onlineUsers = userSessionService.getOnlineUsers();

        messagingTemplate.convertAndSend(
                "/topic/online-users",
                onlineUsers
        );

        log.info("[CHAT] Online-user list broadcast: {}", onlineUsers);
    }

    private void deliverPendingMessages(String username) {
        List<ChatHistory> pending = chatHistoryRepository
                .findByReceiverAndStatus(username, MessageStatus.SENT);

        if (pending.isEmpty()) return;

        pending.forEach(m -> m.setStatus(MessageStatus.DELIVERED));
        chatHistoryRepository.saveAll(pending);

        Map<String, List<UUID>> bySender = pending.stream()
                .collect(Collectors.groupingBy(
                        ChatHistory::getSender,
                        Collectors.mapping(ChatHistory::getMessageId, Collectors.toList())
                ));

        bySender.forEach((sender, ids) ->
                messagingTemplate.convertAndSendToUser(
                        sender,
                        "/queue/message-status",
                        new MessageStatusUpdate(ids, username, "DELIVERED")
                )
        );
    }
}