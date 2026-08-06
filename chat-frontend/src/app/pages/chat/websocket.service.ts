import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  private socket!: WebSocket;

  connect(onMessage: (msg: string) => void) {

    this.socket = new WebSocket("ws://localhost:8081/chat");

    this.socket.onopen = () => {
      console.log("✅ Connected to Spring Boot");
    };

    this.socket.onmessage = (event) => {
      onMessage(event.data);
    };

    this.socket.onclose = () => {
      console.log("❌ Connection Closed");
    };

    this.socket.onerror = (err) => {
      console.log("WebSocket Error", err);
    };
  }

  send(username: string, message: string) {
    this.socket.send(JSON.stringify({
      username,
      message
    }));
  }
}