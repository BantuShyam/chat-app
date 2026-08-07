package com.chatapp.chat_backend.controller;

import com.chatapp.chat_backend.dto.ChatMessage;
import com.chatapp.chat_backend.model.ChatHistory;
import com.chatapp.chat_backend.repository.ChatHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatHistoryRepository chatHistoryRepository;

    @MessageMapping("/send")
    public void send(ChatMessage message, Principal principal) {

        ChatHistory entity = new ChatHistory();
        entity.setSender(message.getSender());
        entity.setReceiver(message.getReceiver());
        entity.setMessage(message.getMessage());
        chatHistoryRepository.save(entity);

        messagingTemplate.convertAndSendToUser(
                message.getReceiver(),
                "/queue/messages",
                message
        );

        messagingTemplate.convertAndSendToUser(
                message.getSender(),
                "/queue/messages",
                message
        );
    }
}