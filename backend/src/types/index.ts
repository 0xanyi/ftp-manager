export interface User {
  id: string;
  email: string;
  role: 'admin' | 'channel_user';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ftpPath: string;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface GuestUploadLink {
  id: string;
  token: string;
  channelId?: string;
  guestFolder?: string;
  description?: string;
  expiresAt?: Date;
  maxUploads?: number;
  uploadCount: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthPayload {
  id: string;
  email: string;
  role: string;
  channels?: string[];
}

export interface JwtTokens {
  accessToken: string;
  refreshToken: string;
}

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  FTP_ERROR = 'FTP_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}