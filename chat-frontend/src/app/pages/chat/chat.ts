import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsocketService } from './websocket.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.css']
})
export class ChatComponent implements OnInit {

  username = "User";

  joined = false;

  message = "";

  messages: string[] = [];

  constructor(private socket: WebsocketService) {}

  ngOnInit(): void {

    this.socket.connect((msg) => {

      this.messages.push(msg);

    });

  }
  join(){

    if(this.username.trim()){

        this.joined = true;

    }

}

  send() {

    if (this.message.trim()) {

      this.socket.send(this.username, this.message);

      this.message = "";

    }

  }

}