        package com.chatapp.chat_backend.service;

        import lombok.extern.slf4j.Slf4j;
        import org.springframework.stereotype.Service;

        import java.util.HashSet;
        import java.util.Set;
        import java.util.concurrent.ConcurrentHashMap;

        @Service
        @Slf4j
        public class UserSessionService {

            private final ConcurrentHashMap<String, String> sessions =
                    new ConcurrentHashMap<>();

            public void addUser(String sessionId, String username) {

                sessions.put(sessionId, username);

                log.info("[CHAT] User connected: {}", username);
                log.info("[CHAT] Online users: {}", getOnlineUsers());
            }

            public void removeUser(String sessionId) {

                String username = sessions.remove(sessionId);

                if (username != null) {
                    log.info("[CHAT] User disconnected: {}", username);
                }

                log.info("[CHAT] Online users: {}", getOnlineUsers());
            }

            public Set<String> getOnlineUsers() {
                return new HashSet<>(sessions.values());
            }
        }