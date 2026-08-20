package com.chatapp.chat_backend.controller;

import com.chatapp.chat_backend.model.User;
import com.chatapp.chat_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/{username}/profile-picture")
    public ResponseEntity<?> getProfilePicture(@PathVariable String username) {
        User user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Map.of("profilePicture",
                user.getProfilePicture() == null ? "" : user.getProfilePicture()));
    }

    @PutMapping("/me/profile-picture")
    public ResponseEntity<Void> uploadProfilePicture(
            @RequestBody Map<String, String> body,
            Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(401).build();
        }

        String username = authentication.getName();
        String base64Image = body.get("imageBase64");

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        user.setProfilePicture(base64Image);
        userRepository.save(user);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/profile-pictures")
    public ResponseEntity<Map<String, String>> getProfilePictures(
            @RequestBody Map<String, List<String>> body) {

        List<String> usernames = body.get("usernames");
        if (usernames == null || usernames.isEmpty()) {
            return ResponseEntity.ok(Map.of());
        }

        List<User> users = userRepository.findByUsernameIn(usernames);

        Map<String, String> result = new HashMap<>();
        for (User u : users) {
            if (u.getProfilePicture() != null) {
                result.put(u.getUsername(), u.getProfilePicture());
            }
        }

        return ResponseEntity.ok(result);
    }
}