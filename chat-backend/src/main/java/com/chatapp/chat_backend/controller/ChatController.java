package com.chatapp.chat_backend.controller;

import com.chatapp.chat_backend.dto.ChatMessage;
import com.chatapp.chat_backend.service.ChatService;
import com.sun.security.auth.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;


@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;


    @MessageMapping("/send")
    public void send(ChatMessage message, Principal  principal) {
        System.out.println("Message from principal: " + (principal != null ? principal.getName() : "NULL"));
        System.out.println(message);
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