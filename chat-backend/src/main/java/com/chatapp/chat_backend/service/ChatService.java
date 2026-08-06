package com.chatapp.chat_backend.service;


import com.chatapp.chat_backend.dto.ChatMessage;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    public ChatMessage processMessage(ChatMessage message) {

        System.out.println("Message received from: " + message.getSender());
        System.out.println("To: " + message.getReceiver());
        System.out.println("Message: " + message.getMessage());

        return message;
    }
}