package com.chatapp.chat_backend.config;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.ArrayList;
import java.util.List;

public class WebSocketHandler extends TextWebSocketHandler {

    private final List<WebSocketSession> sessions = new ArrayList<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {

        sessions.add(session);

        System.out.println("Client Connected");
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message)
            throws Exception {

        System.out.println("Received : " + message.getPayload());

        for (WebSocketSession client : sessions) {

            if (client.isOpen()) {

                client.sendMessage(new TextMessage(message.getPayload()));

            }

        }

    }

    @Override
    public void afterConnectionClosed(WebSocketSession session,
                                      CloseStatus status) {

        sessions.remove(session);

        System.out.println("Client Disconnected");

    }

}