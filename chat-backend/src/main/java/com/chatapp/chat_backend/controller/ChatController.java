package com.chatapp.chat_backend.controller;

import com.chatapp.chat_backend.dto.ChatMessage;
import com.chatapp.chat_backend.service.ChatService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;


@Controller
public class ChatController {

    @MessageMapping("/send")
    @SendTo("/topic/messages")
    public ChatMessage send(ChatMessage message) {

        return message;
    }
}