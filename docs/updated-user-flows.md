# Updated User Flows Based on Feedback

## Overview

Based on user feedback, we're updating the user flows to implement two key improvements:
1. Channel users get direct access to their assigned channels without channel selection
2. Guest upload functionality with unique links for anonymous uploads

## Updated User Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Login / Guest Access                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │   User Login    │    │        Guest Upload Link           │ │
│  │                 │    │                                     │ │
│  │ Email/Password  │    │  https://app.com/guest/unique-token │ │
│  │ [Login]         │    │                                     │ │
│  └─────────────────┘    └─────────────────────────────────────┘ │
│           │                           │                        │
│           ▼                           ▼                        │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │ Channel User    │    │        Guest Upload Page           │ │
│  │ Direct Access   │    │                                     │ │
│  │                 │    │  Upload files without login         │ │
│  │ Love Channel    │    │  Files go to designated location    │ │
│  │ Files & Upload  │    │                                     │ │
│  └─────────────────┘    └─────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Admin User                              │ │
│  │                                                             │ │
│  │ • View all channels                                        │ │
│  • Manage all users                                          │ │
│  • Access all files across all channels                      │ │
│  • Create guest upload links                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Updated Database Schema

### New Tables for Guest Uploads

```sql
-- Guest upload links table
CREATE TABLE guest_upload_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    guest_folder VARCHAR(255), -- Optional specific guest folder
    description TEXT,
    expires_at TIMESTAMP,
    max_uploads INTEGER DEFAULT NULL, -- NULL for unlimited
    upload_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update files table to track guest uploads
ALTER TABLE files ADD COLUMN guest_upload_link_id UUID REFERENCES guest_upload_links(id) ON DELETE SET NULL;
ALTER TABLE files ADD COLUMN uploaded_by_guest BOOLEAN DEFAULT false;
```

### Updated Prisma Schema

```prisma
model GuestUploadLink {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  token        String   @unique @db.VarChar(255)
  channelId    String?  @map("channel_id") @db.Uuid
  channel      Channel? @relation("GuestUploadLinks", fields: [channelId], references: [id], onDelete: Cascade)
  guestFolder  String?  @map("guest_folder") @db.VarChar(255)
  description  String?  @db.Text
  expiresAt    DateTime? @map("expires_at")
  maxUploads   Int?     @map("max_uploads")
  uploadCount  Int      @default(0) @map("upload_count")
  isActive     Boolean  @default(true) @map("is_active")
  createdBy    String?  @map("created_by") @db.Uuid
  creator      User?    @relation("CreatedGuestLinks", fields: [createdBy], references: [id], onDelete: SetNull)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  
  // Relations
  files File[] @relation("GuestUploadFiles")
  
  @@map("guest_upload_links")
}

// Update File model
model File {
  // ... existing fields ...
  guestUploadLinkId String?  @map("guest_upload_link_id") @db.Uuid
  guestUploadLink    GuestUploadLink? @relation("GuestUploadFiles", fields: [guestUploadLinkId], references: [id], onDelete: SetNull)
  uploadedByGuest    Boolean @default(false) @map("uploaded_by_guest")
  
  // ... existing relations ...
}

// Update User model
model User {
  // ... existing fields ...
  createdGuestLinks GuestUploadLink[] @relation("CreatedGuestLinks")
  
  // ... existing relations ...
}

// Update Channel model
model Channel {
  // ... existing fields ...
  guestUploadLinks GuestUploadLink[] @relation("GuestUploadLinks")
  
  // ... existing relations ...
}
```

## Updated API Endpoints

### Guest Upload Endpoints

#### GET /api/guest/:token
**Description**: Validate guest upload token and get upload page details

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "unique-token",
    "channel": {
      "id": "uuid",
      "name": "Love Channel",
      "slug": "love"
    },
    "guestFolder": "guest-uploads",
    "description": "Upload files for Love Channel",
    "expiresAt": "2023-12-31T23:59:59Z",
    "maxUploads": 10,
    "uploadCount": 3,
    "remainingUploads": 7
  }
}
```

#### POST /api/guest/:token/upload
**Description**: Upload file as guest using the token

**Request Body** (multipart/form-data):
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
    "originalName": "guest-file.mp3",
    "mimeType": "audio/mpeg",
    "size": 5242880,
    "uploadedByGuest": true,
    "createdAt": "2023-01-01T00:00:00Z"
  }
}
```

### Admin Guest Link Management

#### GET /api/admin/guest-links
**Description**: Get all guest upload links (admin only)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "token": "unique-token",
      "channel": {
        "id": "uuid",
        "name": "Love Channel",
        "slug": "love"
      },
      "guestFolder": "guest-uploads",
      "description": "Upload files for Love Channel",
      "expiresAt": "2023-12-31T23:59:59Z",
      "maxUploads": 10,
      "uploadCount": 3,
      "isActive": true,
      "createdAt": "2023-01-01T00:00:00Z",
      "createdBy": {
        "id": "uuid",
        "email": "admin@example.com"
      }
    }
  ]
}
```

#### POST /api/admin/guest-links
**Description**: Create new guest upload link (admin only)

**Request Body**:
```json
{
  "channelId": "uuid",
  "guestFolder": "guest-uploads",
  "description": "Upload files for Love Channel",
  "expiresAt": "2023-12-31T23:59:59Z",
  "maxUploads": 10
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "token": "unique-token",
    "url": "https://app.com/guest/unique-token",
    "channel": {
      "id": "uuid",
      "name": "Love Channel",
      "slug": "love"
    },
    "guestFolder": "guest-uploads",
    "description": "Upload files for Love Channel",
    "expiresAt": "2023-12-31T23:59:59Z",
    "maxUploads": 10,
    "uploadCount": 0,
    "isActive": true,
    "createdAt": "2023-01-01T00:00:00Z"
  }
}
```

## Updated Frontend User Flows

### 1. Channel User Direct Access

```
┌─────────────────────────────────────────────────────────────────┐
│  Love Channel                                    [Logout]       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Welcome back, John!                                           │
│  You have access to Love Channel                               │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐ │
│  │    Upload Area      │  │      File List                      │ │
│  │                     │  │                                     │ │
│  │  Drag & Drop files  │  │  ┌─────────────────────────────────┐ │ │
│  │  or click to browse │  │  │ love-song.mp3       │ [DL][Del] │ │ │
│  │                     │  │  │ 3.2 MB • 2 days ago │            │ │ │
│  │   [Browse Files]    │  │  └─────────────────────────────────┘ │ │
│  │                     │  │                                     │ │
│  │  Max file size: 5GB │  │  ┌─────────────────────────────────┐ │ │
│  └─────────────────────┘  │  │ podcast-ep1.mp3     │ [DL][Del] │ │ │
│                            │  │ 15.7 MB • 1 week ago│            │ │
│                            │  └─────────────────────────────────┘ │ │
│                            │                                     │ │
│                            │            Total: 25 files          │ │
│                            └─────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Guest Upload Interface

```
┌─────────────────────────────────────────────────────────────────┐
│                    Guest Upload                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Upload files to Love Channel                                  │
│                                                                 │
│  Description: Upload files for Love Channel content            │
│                                                                 │
│  ┌─────────────────────┐                                      │
│  │    Upload Area      │                                      │
│  │                     │                                      │
│  │  Drag & Drop files  │                                      │
│  │  or click to browse │                                      │
│  │                     │                                      │
│  │   [Browse Files]    │                                      │
│  │                     │                                      │
│  │  Max file size: 5GB │                                      │
│  └─────────────────────┘                                      │
│                                                                 │
│  No login required. Your files will be uploaded securely.      │
│                                                                 │
│  Uploads remaining: 7 of 10                                   │
│  Link expires: December 31, 2023                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Admin Guest Link Management

```
┌─────────────────────────────────────────────────────────────────┐
│  Guest Upload Links                            [+ Create Link] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Search: [________________]  Status: [Active ▼]                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Link │ Channel │ Guest Folder │ Uploads │ Expires │ Action │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ https://app.com/... │ Love │ guest │ 3/10 │ Dec 31 │[Copy]│ │
│  │ [Edit] [Delete]     │      │       │       │        │[Del]│ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ https://app.com/... │ Jammy│ temp  │ 5/5   │ Expired│[Copy]│ │
│  │ [Edit] [Delete]     │      │       │       │        │[Del]│ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Updated Authentication Flow

### Channel User Authentication
1. User logs in with email/password
2. System retrieves user's assigned channels
3. If user has only one channel: redirect directly to that channel
4. If user has multiple channels: show channel selector (for multi-channel users)
5. Admin users see all channels

### Guest Access Flow
1. Guest accesses unique URL
2. System validates token and checks if link is active
3. Upload page is displayed without authentication
4. Files are uploaded with guest attribution
5. Upload count is tracked and link status updated

## Security Considerations for Guest Uploads

### 1. Token Security
- Cryptographically secure random tokens
- Token expiration handling
- Rate limiting per token
- Upload limits per token

### 2. File Validation
- Same file type and size validation as authenticated users
- Virus scanning for guest uploads
- Temporary quarantine for guest files

### 3. Access Control
- Guest uploads go to designated folders
- Admin can review and manage guest uploads
- Guest upload links can be deactivated

## Updated User Experience Benefits

1. **Simplified Channel User Experience**: Direct access to assigned channels without extra navigation steps
2. **Flexible Guest Uploads**: Easy way to collect files from external contributors
3. **Admin Control**: Full oversight of all channels and guest uploads
4. **Security**: Guest uploads are controlled and tracked
5. **Scalability**: Easy to create temporary upload access for specific projects

This updated design addresses your feedback while maintaining the robust, secure architecture of the original plan.