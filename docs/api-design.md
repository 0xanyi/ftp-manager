# API Design & Authentication Flow

## Authentication Strategy

We'll use JWT (JSON Web Tokens) for authentication with the following flow:

1. User submits credentials to `/api/auth/login`
2. Server validates credentials and returns JWT with user info and permissions
3. Client includes JWT in Authorization header for subsequent requests
4. Server validates JWT on protected routes
5. Token expires after configurable time (e.g., 24 hours)

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
**Description**: Authenticate user and return JWT token

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "channel_user",
      "channels": [
        {
          "id": "uuid",
          "name": "Love Channel",
          "slug": "love"
        }
      ]
    },
    "expiresIn": "24h"
  }
}
```

#### POST /api/auth/refresh
**Description**: Refresh JWT token

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

#### POST /api/auth/logout
**Description**: Invalidate JWT token (add to blacklist)

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Channel Endpoints

#### GET /api/channels
**Description**: Get list of channels accessible to the user

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Love Channel",
      "slug": "love",
      "description": "Love channel content",
      "createdAt": "2023-01-01T00:00:00Z",
      "isActive": true
    }
  ]
}
```

#### GET /api/channels/:slug
**Description**: Get specific channel details

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Love Channel",
    "slug": "love",
    "description": "Love channel content",
    "createdAt": "2023-01-01T00:00:00Z",
    "isActive": true
  }
}
```

### File Management Endpoints

#### GET /api/channels/:slug/files
**Description**: Get list of files in a channel

**Request Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: Sort by field (default: createdAt)
- `order`: Sort order (asc/desc, default: desc)

**Response**:
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "uuid",
        "filename": "generated-filename.mp3",
        "originalName": "love-song.mp3",
        "mimeType": "audio/mpeg",
        "size": 5242880,
        "createdAt": "2023-01-01T00:00:00Z",
        "uploadedBy": {
          "id": "uuid",
          "email": "user@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

#### POST /api/channels/:slug/files/upload
**Description**: Upload file to channel (supports chunked uploads)

**Request Headers**:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body** (Form Data):
- `file`: File data
- `chunkIndex`: Chunk index (for chunked uploads)
- `totalChunks`: Total number of chunks
- `fileId`: Unique file identifier for chunked uploads
- `originalName`: Original filename

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "generated-filename.mp3",
    "originalName": "love-song.mp3",
    "mimeType": "audio/mpeg",
    "size": 5242880,
    "createdAt": "2023-01-01T00:00:00Z",
    "uploadComplete": true
  }
}
```

#### GET /api/files/:id/download
**Description**: Download file from FTP server

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**: File stream with appropriate headers

#### DELETE /api/files/:id
**Description**: Delete file from FTP server and database

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

#### GET /api/files/:id/preview
**Description**: Get file preview information (for supported file types)

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "previewUrl": "/api/files/uuid/preview-content",
    "type": "audio",
    "metadata": {
      "duration": 180,
      "bitrate": 320,
      "format": "mp3"
    }
  }
}
```

### Admin Endpoints

#### GET /api/admin/channels
**Description**: Get all channels (admin only)

**Request Headers**:
```
Authorization: Bearer <admin-token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Love Channel",
      "slug": "love",
      "description": "Love channel content",
      "ftpPath": "/love",
      "createdAt": "2023-01-01T00:00:00Z",
      "isActive": true,
      "userCount": 5,
      "fileCount": 25
    }
  ]
}
```

#### POST /api/admin/channels
**Description**: Create new channel (admin only)

**Request Headers**:
```
Authorization: Bearer <admin-token>
```

**Request Body**:
```json
{
  "name": "New Channel",
  "slug": "new-channel",
  "description": "Description of new channel",
  "ftpPath": "/new-channel"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "New Channel",
    "slug": "new-channel",
    "description": "Description of new channel",
    "ftpPath": "/new-channel",
    "createdAt": "2023-01-01T00:00:00Z",
    "isActive": true
  }
}
```

#### PUT /api/admin/channels/:id
**Description**: Update channel (admin only)

**Request Headers**:
```
Authorization: Bearer <admin-token>
```

**Request Body**:
```json
{
  "name": "Updated Channel Name",
  "description": "Updated description",
  "isActive": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Channel Name",
    "slug": "channel-slug",
    "description": "Updated description",
    "ftpPath": "/channel-slug",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-02T00:00:00Z",
    "isActive": false
  }
}
```

#### GET /api/admin/users
**Description**: Get all users (admin only)

**Request Headers**:
```
Authorization: Bearer <admin-token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "channel_user",
      "createdAt": "2023-01-01T00:00:00Z",
      "lastLoginAt": "2023-01-01T12:00:00Z",
      "isActive": true,
      "channels": [
        {
          "id": "uuid",
          "name": "Love Channel",
          "slug": "love"
        }
      ]
    }
  ]
}
```

#### POST /api/admin/users
**Description**: Create new user (admin only)

**Request Headers**:
```
Authorization: Bearer <admin-token>
```

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "channel_user",
  "channelIds": ["uuid1", "uuid2"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newuser@example.com",
    "role": "channel_user",
    "createdAt": "2023-01-01T00:00:00Z",
    "isActive": true,
    "channels": [
      {
        "id": "uuid1",
        "name": "Love Channel",
        "slug": "love"
      }
    ]
  }
}
```

#### PUT /api/admin/users/:id/channels
**Description**: Update user channel assignments (admin only)

**Request Headers**:
```
Authorization: Bearer <admin-token>
```

**Request Body**:
```json
{
  "channelIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "assignedChannels": [
      {
        "id": "uuid1",
        "name": "Love Channel",
        "slug": "love"
      }
    ]
  }
}
```

## WebSocket Events (for real-time upload progress)

### Connection
```
ws://localhost:3000/upload-progress
```

### Authentication
Send JWT token as first message:
```json
{
  "type": "auth",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Events

#### Upload Progress (Server → Client)
```json
{
  "type": "upload_progress",
  "data": {
    "fileId": "uuid",
    "progress": 45,
    "bytesUploaded": 2361398,
    "totalBytes": 5242880,
    "status": "uploading"
  }
}
```

#### Upload Complete (Server → Client)
```json
{
  "type": "upload_complete",
  "data": {
    "fileId": "uuid",
    "filename": "generated-filename.mp3"
  }
}
```

#### Upload Error (Server → Client)
```json
{
  "type": "upload_error",
  "data": {
    "fileId": "uuid",
    "error": "FTP connection failed"
  }
}
```

## Error Response Format

All API endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Email is required"
    }
  }
}
```

## Common Error Codes

- `UNAUTHORIZED`: Invalid or missing authentication
- `FORBIDDEN`: User doesn't have permission for the resource
- `NOT_FOUND`: Resource doesn't exist
- `VALIDATION_ERROR`: Input validation failed
- `FILE_TOO_LARGE`: File exceeds size limit
- `UPLOAD_ERROR`: File upload failed
- `FTP_ERROR`: FTP operation failed
- `INTERNAL_ERROR`: Server error

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- File upload: 10 uploads per hour per user
- General API: 100 requests per minute per user
- Admin endpoints: 200 requests per minute per admin

## Request Validation

All endpoints will validate:
- Authentication token validity
- User permissions for the resource
- Input data format and constraints
- File size and type restrictions
- Rate limits