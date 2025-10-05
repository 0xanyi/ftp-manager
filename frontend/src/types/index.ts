export interface User {
  id: string;
  email: string;
  role: 'admin' | 'channel_user';
  channels: Channel[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ftpPath: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface File {
  id: string;
  filename: string;
  originalName: string;
  mimeType?: string;
  size: number;
  ftpPath: string;
  channelId: string;
  uploadedBy: string;
  uploadedByGuest: boolean;
  guestUploadLinkId?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface GuestUploadLink {
  id: string;
  token: string;
  channelId?: string;
  channel?: Channel;
  guestFolder?: string;
  description?: string;
  expiresAt?: string;
  maxUploads?: number;
  uploadCount: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}