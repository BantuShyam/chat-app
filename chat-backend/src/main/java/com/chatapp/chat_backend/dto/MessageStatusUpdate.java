package com.chatapp.chat_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MessageStatusUpdate {
    private List<UUID> messageIds;
    private String otherUser;
    private String status;
}