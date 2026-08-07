import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsocketService } from './websocket.service';

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
  joined = false;

  receiver = '';
  message = '';

  messages = signal<ChatMessage[]>([]);
  onlineUsers = signal<string[]>([]);

  constructor(private socket: WebsocketService) {}

  ngOnInit(): void {}

  join(): void {
    if (!this.username.trim()) {
      return;
    }

    this.joined = true;

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
    this.messages.set([]); // clear view when switching conversation (Phase 4 will restore history from DB)
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

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}