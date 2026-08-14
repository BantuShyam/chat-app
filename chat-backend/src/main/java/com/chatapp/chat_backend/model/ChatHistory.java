package com.chatapp.chat_backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", nullable = false, unique = true)
    private UUID messageId;

    @Column(nullable = false)
    private String sender;

    @Column(nullable = false)
    private String receiver;

    @Column(length = 2000)
    private String message;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private MessageStatus status = MessageStatus.SENT;

    @Column(name = "attachment_data", columnDefinition = "TEXT")
    private String attachmentData;

    @Column(name = "attachment_type")
    private String attachmentType;

    @Column(name = "attachment_name")
    private String attachmentName;

    @PrePersist
    protected void onCreate() {
        this.timestamp = LocalDateTime.now();
    }
}