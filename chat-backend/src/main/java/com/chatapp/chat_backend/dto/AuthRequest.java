package com.chatapp.chat_backend.dto;

import lombok.Data;

@Data
public class AuthRequest {
    private String username;
    private String password;
}