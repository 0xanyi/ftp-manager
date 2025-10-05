import { apiService } from './api';
import { User, AuthTokens, ApiResponse } from '../types';

export const authService = {
  async login(email: string, password: string) {
    return apiService.post<{
      user: User;
      tokens: AuthTokens;
    }>('/auth/login', { email, password });
  },

  async register(email: string, password: string, role?: string) {
    return apiService.post<{
      user: User;
      tokens: AuthTokens;
    }>('/auth/register', { email, password, role });
  },

  async refreshToken() {
    const tokens = JSON.parse(localStorage.getItem('authTokens') || '{}');
    return apiService.post<{ tokens: AuthTokens }>('/auth/refresh', {
      refreshToken: tokens.refreshToken,
    });
  },

  async getCurrentUser() {
    return apiService.get<{ user: User }>('/auth/me');
  },

  async logout() {
    return apiService.post<{ message: string }>('/auth/logout');
  },
};