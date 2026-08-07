import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsocketService } from './websocket.service';
import { AuthService } from '../../auth.service';
import { ChatHistoryService } from '../../chat-history.service';

interface ChatMessage {
  sender: string;
  receiver: string;
  message: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css']
})
export class ChatComponent implements OnInit, OnDestroy {

  username = '';
  receiver = '';
  message = '';

  messages = signal<ChatMessage[]>([]);
  onlineUsers = signal<string[]>([]);

  constructor(
    private socket: WebsocketService,
    private authService: AuthService,
    private historyService: ChatHistoryService
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() || '';

    this.socket.connect(
      this.username,
      (msg: ChatMessage) => {
        const isRelevant =
          (msg.sender === this.username && msg.receiver === this.receiver) ||
          (msg.sender === this.receiver && msg.receiver === this.username);

        if (isRelevant) {
          this.messages.update(current => [...current, msg]);
        }
      },
      (users: string[]) => {
        this.onlineUsers.set(users.filter(u => u !== this.username));
      }
    );
  }

  selectUser(user: string): void {
    this.receiver = user;
    this.messages.set([]);

    this.historyService.getConversation(this.username, user).subscribe({
      next: (history) => {
        this.messages.set(history.map(h => ({
          sender: h.sender,
          receiver: h.receiver,
          message: h.message
        })));
      },
      error: (err) => console.error('Failed to load history', err)
    });
  }

  send(): void {
    if (this.message.trim() && this.receiver) {
      this.socket.send(this.username, this.receiver, this.message);
      this.message = '';
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  logout(): void {
    this.authService.logout();
    this.socket.disconnect();
    window.location.href = '/login';
  }

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}