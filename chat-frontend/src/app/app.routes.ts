import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { ChatComponent } from './pages/chat/chat';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'chat', component: ChatComponent, canActivate: [authGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];