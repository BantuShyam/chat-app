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
    username: string,
    onMessage: (msg: any) => void,
    onUserListUpdate: (users: string[]) => void
  ): void {

    this.client = new Client({
      webSocketFactory: () => new SockJS(`http://localhost:8081/chat?username=${username}`),
      reconnectDelay: 5000,
      debug: (str) => console.log('[STOMP]', str)
    });

this.client.onConnect = () => {
  console.log('Connected as', username);

  // subscribe to the init snapshot FIRST, before triggering it
  this.client.subscribe('/user/queue/online-users-init', (message) => {
    const users = JSON.parse(message.body);
    this.zone.run(() => onUserListUpdate(users));
  });

  this.client.subscribe('/user/queue/messages', (message) => {
    const parsed = JSON.parse(message.body);
    this.zone.run(() => onMessage(parsed));
  });

  // this subscribe triggers the backend to send the snapshot —
  // must come after the init subscription above
  this.client.subscribe('/topic/online-users', (message) => {
    const users = JSON.parse(message.body);
    this.zone.run(() => onUserListUpdate(users));
  });
    };

    this.client.onStompError = (frame) => {
      console.error('STOMP error:', frame.headers, frame.body);
    };

    this.client.activate();
  }

  send(sender: string, receiver: string, message: string): void {
    this.client.publish({
      destination: '/app/send',
      body: JSON.stringify({ sender, receiver, message })
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
    }
  }
}