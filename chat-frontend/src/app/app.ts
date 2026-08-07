import { Component, signal } from '@angular/core';
import { ChatComponent } from './pages/chat/chat';

@Component({
  selector: 'app-root',
  imports: [ChatComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('chat-frontend');
}