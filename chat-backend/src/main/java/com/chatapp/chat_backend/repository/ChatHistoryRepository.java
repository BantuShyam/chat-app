package com.chatapp.chat_backend.repository;


import com.chatapp.chat_backend.model.ChatHistory;
import com.chatapp.chat_backend.model.MessageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatHistoryRepository extends JpaRepository<ChatHistory, Long> {

    @Query("SELECT m FROM ChatHistory  m WHERE " +
            "(m.sender = :user1 AND m.receiver = :user2) OR " +
            "(m.sender = :user2 AND m.receiver = :user1) " +
            "ORDER BY m.timestamp ASC")
    List<ChatHistory> findConversation(@Param("user1") String user1, @Param("user2") String user2);


    List<ChatHistory> findBySenderAndReceiverAndStatus(String sender, String receiver, MessageStatus status);

    List<ChatHistory> findByReceiverAndStatus(String receiver, MessageStatus status);
}