import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessageRecord {
  sender: string;
  receiver: string;
  message: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatHistoryService {

  private baseUrl = 'http://localhost:8081/api/messages';

  constructor(private http: HttpClient) {}

  getConversation(user1: string, user2: string): Observable<ChatMessageRecord[]> {
    return this.http.get<ChatMessageRecord[]>(`${this.baseUrl}/${user1}/${user2}`);
  }
}