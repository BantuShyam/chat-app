import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private baseUrl = 'http://localhost:8081/api/users';

  constructor(private http: HttpClient) {}

  uploadProfilePicture(imageBase64: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/me/profile-picture`, { imageBase64 });
  }

  getProfilePicture(username: string): Observable<{ profilePicture: string | null }> {
    return this.http.get<{ profilePicture: string | null }>(`${this.baseUrl}/${username}/profile-picture`);
  }

  getProfilePictures(usernames: string[]): Observable<{ [username: string]: string }> {
    return this.http.post<{ [username: string]: string }>(`${this.baseUrl}/profile-pictures`, { usernames });
  }
}