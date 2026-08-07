import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {

  mode: 'login' | 'register' = 'login';

  username = '';
  password = '';
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

  toggleMode(): void {
    this.mode = this.mode === 'login' ? 'register' : 'login';
    this.error = '';
  }

  submit(): void {
    this.error = '';

    if (!this.username.trim() || !this.password.trim()) {
      this.error = 'Please fill in both fields';
      return;
    }

    const request = this.mode === 'login'
      ? this.authService.login(this.username, this.password)
      : this.authService.register(this.username, this.password);

    request.subscribe({
      next: () => this.router.navigate(['/chat']),
      error: (err) => {
        this.error = err?.error || 'Something went wrong';
      }
    });
  }
}