package com.chatapp.chat_backend.controller;

import com.chatapp.chat_backend.dto.ChatMessage;
import com.chatapp.chat_backend.dto.MessageStatusUpdate;
import com.chatapp.chat_backend.dto.TypingIndicator;
import com.chatapp.chat_backend.model.ChatHistory;
import com.chatapp.chat_backend.model.MessageStatus;
import com.chatapp.chat_backend.repository.ChatHistoryRepository;
import com.chatapp.chat_backend.service.UserSessionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Controller
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatHistoryRepository chatHistoryRepository;

    @Autowired
    private UserSessionService userSessionService;

    @MessageMapping("/send")
    public void send(ChatMessage message, Principal principal) {

        UUID messageId = UUID.randomUUID();
        LocalDateTime timestamp = LocalDateTime.now();

        String sender = principal != null
                ? principal.getName()
                : message.getSender();

        boolean receiverOnline = userSessionService.getOnlineUsers()
                .contains(message.getReceiver());

        MessageStatus status = receiverOnline
                ? MessageStatus.DELIVERED
                : MessageStatus.SENT;

        message.setMessageId(messageId);
        message.setSender(sender);
        message.setTimestamp(timestamp);
        message.setStatus(status);

        ChatHistory entity = new ChatHistory();
        entity.setMessageId(messageId);
        entity.setSender(sender);
        entity.setReceiver(message.getReceiver());
        entity.setMessage(message.getMessage());
        entity.setTimestamp(timestamp);
        entity.setStatus(status);
        entity.setAttachmentData(message.getAttachmentData());
        entity.setAttachmentType(message.getAttachmentType());
        entity.setAttachmentName(message.getAttachmentName());

        chatHistoryRepository.save(entity);

        log.info("Chat message persisted with status: {}", status);

        messagingTemplate.convertAndSendToUser(
                message.getReceiver(),
                "/queue/messages",
                message
        );

        messagingTemplate.convertAndSendToUser(
                sender,
                "/queue/messages",
                message
        );
    }

    @MessageMapping("/markSeen")
    public void markSeen(ChatMessage payload, Principal principal) {

        String viewer = principal != null ? principal.getName() : payload.getReceiver();
        String otherUser = payload.getSender();

        List<ChatHistory> toUpdate =
                chatHistoryRepository.findBySenderAndReceiverAndStatus(
                        otherUser, viewer, MessageStatus.SENT);

        toUpdate.addAll(
                chatHistoryRepository.findBySenderAndReceiverAndStatus(
                        otherUser, viewer, MessageStatus.DELIVERED));

        if (toUpdate.isEmpty()) return;

        List<UUID> ids = toUpdate.stream()
                .map(ChatHistory::getMessageId)
                .collect(Collectors.toList());

        toUpdate.forEach(m -> m.setStatus(MessageStatus.SEEN));
        chatHistoryRepository.saveAll(toUpdate);

        messagingTemplate.convertAndSendToUser(
                otherUser,
                "/queue/message-status",
                new MessageStatusUpdate(ids, viewer, "SEEN")
        );

        log.info("Marked {} messages as SEEN (viewer={}, sender={})", ids.size(), viewer, otherUser);
    }
    @MessageMapping("/typing")
    public void typing(TypingIndicator indicator, Principal principal) {

        String sender = principal != null ? principal.getName() : indicator.getSender();
        indicator.setSender(sender);

        messagingTemplate.convertAndSendToUser(
                indicator.getReceiver(),
                "/queue/typing",
                indicator
        );
    }
}