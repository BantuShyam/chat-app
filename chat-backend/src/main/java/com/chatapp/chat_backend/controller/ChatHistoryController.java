package com.chatapp.chat_backend.controller;


import com.chatapp.chat_backend.model.ChatHistory;
import com.chatapp.chat_backend.repository.ChatHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class ChatHistoryController {

    @Autowired
    private ChatHistoryRepository chatHistoryRepository;

    @GetMapping("/{user1}/{user2}")
    public List<ChatHistory> getConversation(
            @PathVariable String user1,
            @PathVariable String user2) {
        return chatHistoryRepository.findConversation(user1, user2);
    }
}