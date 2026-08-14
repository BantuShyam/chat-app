package com.chatapp.chat_backend.model;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessage {

    private UUID messageId;
    private String sender;
    private String receiver;
    private String message;
    private LocalDateTime timestamp;
    private MessageStatus status;
}