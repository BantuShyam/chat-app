import { Injectable, NgZone } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  private client!: Client;

  constructor(private zone: NgZone) {}

  connect(
    token: string,
    onMessage: (msg: any) => void,
    onUserListUpdate: (users: string[]) => void,
    onStatusUpdate: (update: any) => void,
    onTypingUpdate: (update: { sender: string; receiver: string; typing: boolean }) => void
  ): void {

    this.client = new Client({
      webSocketFactory: () => new SockJS(`http://localhost:8081/chat?token=${encodeURIComponent(token)}`),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });

    this.client.onConnect = () => {

      this.client.subscribe('/user/queue/messages', (message) => {
        const parsed = JSON.parse(message.body);
        this.zone.run(() => onMessage(parsed));
      });

      this.client.subscribe('/user/queue/message-status', (message) => {
        const update = JSON.parse(message.body);
        this.zone.run(() => onStatusUpdate(update));
      });

      this.client.subscribe('/user/queue/typing', (message) => {
        const update = JSON.parse(message.body);
        this.zone.run(() => onTypingUpdate(update));
      });

      this.client.subscribe('/topic/online-users', (message) => {
        const users = JSON.parse(message.body);
        this.zone.run(() => onUserListUpdate(users));
      });
    };

    this.client.onStompError = () => {};

    this.client.activate();
  }

  send(
    sender: string,
    receiver: string,
    message: string,
    attachmentData?: string,
    attachmentType?: string,
    attachmentName?: string
  ): void {
    this.client.publish({
      destination: '/app/send',
      body: JSON.stringify({
        sender,
        receiver,
        message,
        attachmentData: attachmentData || null,
        attachmentType: attachmentType || null,
        attachmentName: attachmentName || null
      })
    });
  }

  markSeen(viewer: string, otherUser: string): void {
    this.client.publish({
      destination: '/app/markSeen',
      body: JSON.stringify({ sender: otherUser, receiver: viewer })
    });
  }

  sendTyping(sender: string, receiver: string, typing: boolean): void {
    this.client.publish({
      destination: '/app/typing',
      body: JSON.stringify({ sender, receiver, typing })
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
    }
  }
}