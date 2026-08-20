import { Component, OnInit, OnDestroy, signal, computed, HostListener } from '@angular/core';
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

  showSidebarSearch = signal<boolean>(false);
  sidebarSearchQuery = signal<string>('');

  showConversationSearch = signal<boolean>(false);
  conversationSearchQuery = signal<string>('');
  searchMatchCount = signal<number>(0);
  currentMatchIndex = signal<number>(0);

  showMoreMenu = signal<boolean>(false);
  showContactInfo = signal<boolean>(false);

filteredChatUsers = computed(() => {
  const query = this.sidebarSearchQuery().trim().toLowerCase();

  const users = [
    ...new Set([
      ...this.chatUsers(),
      ...this.onlineUsers()
    ])
  ].filter(user => user !== this.username);

  if (!query) {
    return users;
  }

  return users.filter(user =>
    user.toLowerCase().includes(query)
  );
});

  private typingTimeout: any = null;

  constructor(
    private socket: WebsocketService,
    private authService: AuthService,
    private historyService: ChatHistoryService,
    private userService: UserService
  ) {}

ngOnInit(): void {
  this.username = this.authService.getUsername() || '';
  const token = this.authService.getToken(); // adjust to your actual AuthService method name

  this.loadChatUsers();

  this.userService.getProfilePicture(this.username).subscribe({
    next: (res: ProfilePictureResponse) => this.myProfilePicture.set(res.profilePicture),
    error: () => {}
  });

  this.socket.connect(
    token || '',
    (msg: ChatMessage) =>  {

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
      const users: string[] = JSON.parse(savedUsers)
        .filter((user: string) => user !== this.username);

      this.chatUsers.set(users);
      this.refreshProfilePictures(users);
    } catch {
      localStorage.removeItem('chatUsers');
    }
  }

  private refreshProfilePictures(usernames: string[]): void {
    const missing = usernames.filter(u => !this.profilePictures()[u]);
    if (missing.length === 0) return;

    this.userService.getProfilePictures(missing).subscribe({
      next: (pics) => {
        this.profilePictures.update(current => ({ ...current, ...pics }));
      },
      error: () => {}
    });
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

    this.refreshProfilePictures([user]);
  }

  isUserOnline(user: string): boolean {
    return this.onlineUsers().includes(user);
  }

  selectUser(user: string): void {

    this.receiver = user;
    this.messages.set([]);
    this.showEmojiPicker.set(false);
    this.pendingAttachment.set(null);

    this.showConversationSearch.set(false);
    this.conversationSearchQuery.set('');
    this.searchMatchCount.set(0);
    this.currentMatchIndex.set(0);
    this.showMoreMenu.set(false);
    this.showContactInfo.set(false);

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

    this.resizeAndCompressImage(file, 200, 200, 0.8)
      .then(base64 => {
        this.userService.uploadProfilePicture(base64).subscribe({
          next: () => this.myProfilePicture.set(base64),
          error: (err) => {
            console.error('Failed to upload profile picture', err);
            alert('Could not update your profile picture. Please try again.');
          }
        });
      })
      .catch(err => {
        console.error('Failed to process image', err);
        alert('Could not process that image. Please try a different file.');
      });

    input.value = '';
  }

  toggleSidebarSearch(): void {
    this.showSidebarSearch.update(v => !v);
    if (!this.showSidebarSearch()) {
      this.sidebarSearchQuery.set('');
    }
  }

  toggleConversationSearch(): void {
    this.showConversationSearch.update(v => !v);
    if (!this.showConversationSearch()) {
      this.conversationSearchQuery.set('');
      this.searchMatchCount.set(0);
      this.currentMatchIndex.set(0);
    }
  }

  onConversationSearchInput(): void {
    const query = this.conversationSearchQuery().trim().toLowerCase();

    if (!query) {
      this.searchMatchCount.set(0);
      this.currentMatchIndex.set(0);
      return;
    }

    const count = this.messages().filter(m =>
      m.message?.toLowerCase().includes(query)
    ).length;

    this.searchMatchCount.set(count);
    this.currentMatchIndex.set(count > 0 ? 1 : 0);

    setTimeout(() => this.scrollToMatch(0), 0);
  }

  isMessageMatch(msg: ChatMessage): boolean {
    const query = this.conversationSearchQuery().trim().toLowerCase();
    if (!query || !msg.message) return false;
    return msg.message.toLowerCase().includes(query);
  }

  nextMatch(): void {
    const count = this.searchMatchCount();
    if (count === 0) return;
    const next = this.currentMatchIndex() >= count ? 1 : this.currentMatchIndex() + 1;
    this.currentMatchIndex.set(next);
    this.scrollToMatch(next - 1);
  }

  prevMatch(): void {
    const count = this.searchMatchCount();
    if (count === 0) return;
    const prev = this.currentMatchIndex() <= 1 ? count : this.currentMatchIndex() - 1;
    this.currentMatchIndex.set(prev);
    this.scrollToMatch(prev - 1);
  }

  private scrollToMatch(matchOrdinal: number): void {
    const elements = document.querySelectorAll('.message-highlight');
    const target = elements[matchOrdinal] as HTMLElement | undefined;
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  toggleMoreMenu(event: Event): void {
    event.stopPropagation();
    this.showMoreMenu.update(v => !v);
  }

  openContactInfo(): void {
    this.showMoreMenu.set(false);
    this.showContactInfo.set(true);
  }

  closeContactInfo(): void {
    this.showContactInfo.set(false);
  }

  clearChat(): void {
    this.showMoreMenu.set(false);

    if (!this.receiver) return;

    const confirmed = confirm(`Clear all messages with ${this.receiver}? This cannot be undone.`);
    if (!confirmed) return;

    this.historyService.clearConversation(this.username, this.receiver).subscribe({
      next: () => this.messages.set([]),
      error: (err) => {
        console.error('Failed to clear chat', err);
        alert('Could not clear this chat. Please try again.');
      }
    });
  }

  @HostListener('document:click')
  closeMoreMenu(): void {
    this.showMoreMenu.set(false);
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
  getDateOnly(timestamp: string | undefined): string {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp);

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

shouldShowDateSeparator(index: number): boolean {
  const messages = this.messages();

  if (index === 0) {
    return true;
  }

  const currentDate = this.getDateOnly(messages[index].timestamp);
  const previousDate = this.getDateOnly(messages[index - 1].timestamp);

  return currentDate !== previousDate;
}

getDateSeparatorLabel(timestamp: string | undefined): string {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp);
  const today = new Date();

  // Today
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return 'Today';
  }

  // Yesterday
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return 'Yesterday';
  }

  // Same week
  if (this.isSameWeek(date, today)) {
    return date.toLocaleDateString([], {
      weekday: 'long'
    });
  }

  // Older messages
  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

private isSameWeek(date1: Date, date2: Date): boolean {
  const startOfWeek = (date: Date): Date => {
    const result = new Date(date);
    const day = result.getDay();

    result.setDate(result.getDate() - day);
    result.setHours(0, 0, 0, 0);

    return result;
  };

  return (
    startOfWeek(date1).getTime() ===
    startOfWeek(date2).getTime()
  );
}

closeChat(): void {
  if (this.receiver) {
    this.socket.sendTyping(this.username, this.receiver, false);
  }

  this.receiver = '';

  this.messages.set([]);

  this.showEmojiPicker.set(false);
  this.pendingAttachment.set(null);

  this.showConversationSearch.set(false);
  this.conversationSearchQuery.set('');
  this.searchMatchCount.set(0);
  this.currentMatchIndex.set(0);

  this.showMoreMenu.set(false);
  this.showContactInfo.set(false);
}
}