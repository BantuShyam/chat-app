import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsocketService } from './websocket.service';
import { AuthService } from '../../auth.service';
import { ChatHistoryService } from '../../chat-history.service';
import { UserService } from '../../user.service';

interface ChatMessage {
  messageId?: string;
  sender: string;
  receiver: string;
  message: string;
  timestamp?: string;
  status?: 'SENT' | 'DELIVERED' | 'SEEN';
  attachmentData?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
}

interface ProfilePictureResponse {
  profilePicture: string | null;
}

const EMOJI_LIST = [
  '😀','😁','😂','🤣','😊','😍','😘','😜','🤔','🙄',
  '😴','😢','😭','😡','🤗','👍','👎','👏','🙏','💪',
  '❤️','🔥','🎉','✨','😎','🤝','👌','🙌','😅','😇'
];

const MAX_DOC_SIZE_BYTES = 5 * 1024 * 1024;

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

  emojis = EMOJI_LIST;
  showEmojiPicker = signal<boolean>(false);

  pendingAttachment = signal<{
    data: string;
    type: string;
    name: string;
  } | null>(null);

  messages = signal<ChatMessage[]>([]);
  onlineUsers = signal<string[]>([]);
  chatUsers = signal<string[]>([]);
  unreadCounts = signal<{ [username: string]: number }>({});
  myProfilePicture = signal<string | null>(null);
  profilePictures = signal<{ [username: string]: string }>({});
  enlargedImage = signal<string | null>(null);
  typingUsers = signal<{ [username: string]: boolean }>({});

  private typingTimeout: any = null;

  constructor(
    private socket: WebsocketService,
    private authService: AuthService,
    private historyService: ChatHistoryService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() || '';

    this.loadChatUsers();

    this.userService.getProfilePicture(this.username).subscribe({
      next: (res: ProfilePictureResponse) => this.myProfilePicture.set(res.profilePicture),
      error: () => {}
    });

    this.socket.connect(
      this.username,
      (msg: ChatMessage) => {

        this.addChatUser(msg.sender);
        this.addChatUser(msg.receiver);

        const isCurrentChat =
          (msg.sender === this.username && msg.receiver === this.receiver) ||
          (msg.sender === this.receiver && msg.receiver === this.username);

        if (isCurrentChat) {
          this.messages.update(current => [...current, msg]);

          if (msg.sender !== this.username) {
            this.socket.markSeen(this.username, msg.sender);
          }
          return;
        }

        if (msg.sender !== this.username) {
          this.unreadCounts.update(counts => ({
            ...counts,
            [msg.sender]: (counts[msg.sender] || 0) + 1
          }));
        }
      },
      (users: string[]) => {

        const filteredUsers = users.filter(
          user => user !== this.username
        );

        this.onlineUsers.set(filteredUsers);

        filteredUsers.forEach(user => {
          this.addChatUser(user);
        });
      },
      (update: { messageIds: string[]; otherUser: string; status: 'DELIVERED' | 'SEEN' }) => {
        if (update.otherUser !== this.receiver) return;

        this.messages.update(current =>
          current.map(m =>
            m.messageId && update.messageIds.includes(m.messageId)
              ? { ...m, status: update.status }
              : m
          )
        );
      },
      (update: { sender: string; receiver: string; typing: boolean }) => {
        if (update.sender !== this.receiver) return;

        this.typingUsers.update(current => ({
          ...current,
          [update.sender]: update.typing
        }));
      }
    );
  }

  openImage(src: string): void {
    this.enlargedImage.set(src);
  }

  closeImage(): void {
    this.enlargedImage.set(null);
  }

  onTyping(): void {
    if (!this.receiver) return;

    this.socket.sendTyping(this.username, this.receiver, true);

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.typingTimeout = setTimeout(() => {
      this.socket.sendTyping(this.username, this.receiver, false);
    }, 2000);
  }

  isReceiverTyping(): boolean {
    return !!this.typingUsers()[this.receiver];
  }

  loadChatUsers(): void {
    const savedUsers = localStorage.getItem('chatUsers');

    if (!savedUsers) {
      return;
    }

    try {
      const users: string[] = JSON.parse(savedUsers);

      this.chatUsers.set(
        users.filter(user => user !== this.username)
      );
    } catch {
      localStorage.removeItem('chatUsers');
    }
  }

  addChatUser(user: string): void {
    if (!user || user === this.username) {
      return;
    }

    this.chatUsers.update(users => {

      if (users.includes(user)) {
        return users;
      }

      const updatedUsers = [...users, user];

      localStorage.setItem(
        'chatUsers',
        JSON.stringify(updatedUsers)
      );

      return updatedUsers;
    });
  }

  isUserOnline(user: string): boolean {
    return this.onlineUsers().includes(user);
  }

  selectUser(user: string): void {

    this.receiver = user;
    this.messages.set([]);
    this.showEmojiPicker.set(false);
    this.pendingAttachment.set(null);

    this.typingUsers.update(current => ({ ...current, [user]: false }));

    this.unreadCounts.update(counts => {
      const updated = { ...counts };
      delete updated[user];
      return updated;
    });

    this.historyService
      .getConversation(this.username, user)
      .subscribe({

        next: (history) => {

          this.messages.set(
            history.map(h => ({
              messageId: h.messageId,
              sender: h.sender,
              receiver: h.receiver,
              message: h.message,
              timestamp: h.timestamp,
              status: h.status,
              attachmentData: (h as any).attachmentData,
              attachmentType: (h as any).attachmentType,
              attachmentName: (h as any).attachmentName
            }))
          );

          this.userService.getProfilePicture(user).subscribe({
            next: (res: ProfilePictureResponse) => {
              this.profilePictures.update(pics => ({
                ...pics,
                [user]: res.profilePicture || ''
              }));
            },
            error: () => {}
          });

          this.socket.markSeen(this.username, user);
        },

        error: () => {}
      });
  }

  send(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
    if (this.receiver) {
      this.socket.sendTyping(this.username, this.receiver, false);
    }

    const attachment = this.pendingAttachment();

    if (!this.message.trim() && !attachment) {
      return;
    }

    if (!this.receiver) {
      return;
    }

    this.socket.send(
      this.username,
      this.receiver,
      this.message.trim(),
      attachment?.data,
      attachment?.type,
      attachment?.name
    );

    this.message = '';
    this.pendingAttachment.set(null);
    this.showEmojiPicker.set(false);
  }

  getMessageTime(timestamp: string | undefined): string {

    if (!timestamp) {
      return '';
    }

    const date = new Date(timestamp);

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTickClass(status: string | undefined): string {
    if (status === 'SEEN') return 'seen';
    if (status === 'DELIVERED') return 'delivered';
    return 'sent';
  }

  getUserAvatar(user: string): string | null {
    return this.profilePictures()[user] || null;
  }

  onProfilePictureSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.resizeAndCompressImage(file, 200, 200, 0.8).then(base64 => {
      this.userService.uploadProfilePicture(base64).subscribe({
        next: () => this.myProfilePicture.set(base64),
        error: () => {}
      });
    });

    input.value = '';
  }

  private resizeAndCompressImage(
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          let { width, height } = img;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject('Canvas context unavailable');
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };

        img.onerror = reject;
        img.src = reader.result as string;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker.update(v => !v);
  }

  addEmoji(emoji: string): void {
    this.message += emoji;
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');

    if (!isImage && file.size > MAX_DOC_SIZE_BYTES) {
      input.value = '';
      return;
    }

    if (isImage) {
      this.resizeAndCompressImage(file, 1024, 1024, 0.85).then(base64 => {
        this.pendingAttachment.set({
          data: base64,
          type: file.type,
          name: file.name
        });
      });
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        this.pendingAttachment.set({
          data: reader.result as string,
          type: file.type || 'application/octet-stream',
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  clearAttachment(): void {
    this.pendingAttachment.set(null);
  }

  isImageAttachment(type: string | null | undefined): boolean {
    return !!type && type.startsWith('image/');
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