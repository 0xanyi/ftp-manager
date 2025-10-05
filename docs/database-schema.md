# Database Schema Design

## Overview

The database will store user accounts, channel information, and file metadata. We'll use PostgreSQL as our relational database with Prisma as the ORM.

## Entity Relationship Diagram

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│      User       │      │     Channel     │      │      File       │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │      │ id (PK)         │
│ email           │      │ name            │      │ filename        │
│ passwordHash    │      │ slug            │      │ originalName    │
│ role            │      │ description     │      │ mimeType        │
│ createdAt       │      │ ftpPath         │      │ size            │
│ updatedAt       │      │ createdAt       │      │ ftpPath         │
│ lastLoginAt     │      │ updatedAt       │      │ channelId (FK)  │
│ isActive        │      │ isActive        │      │ uploadedBy (FK) │
│                │      │                │      │ createdAt       │
└─────────────────┘      └─────────────────┘      │ updatedAt       │
         │                       │              │ isActive        │
         │                       │              └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  UserChannel    │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ userId (FK)     │
                    │ channelId (FK)  │
                    │ assignedAt      │
                    │ assignedBy (FK) │
                    └─────────────────┘
```

## Table Definitions

### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'channel_user', -- 'admin' or 'channel_user'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

**Fields:**
- `id`: Unique identifier for each user
- `email`: User's email address (used for login)
- `password_hash`: Hashed password using bcrypt
- `role`: User role (admin or channel_user)
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp
- `last_login_at`: Last successful login timestamp
- `is_active`: Account status (active/inactive)

### Channels Table

```sql
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- Used for URL and FTP folder name
    description TEXT,
    ftp_path VARCHAR(255) NOT NULL, -- Path on FTP server
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

**Fields:**
- `id`: Unique identifier for each channel
- `name`: Human-readable channel name (e.g., "Love Channel")
- `slug`: URL-friendly identifier used for FTP folder (e.g., "love")
- `description`: Channel description
- `ftp_path`: Full path on FTP server where files are stored
- `created_at`: Channel creation timestamp
- `updated_at`: Last update timestamp
- `is_active`: Channel status (active/inactive)

### Files Table

```sql
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL, -- Generated unique filename
    original_name VARCHAR(255) NOT NULL, -- Original user filename
    mime_type VARCHAR(100),
    size BIGINT NOT NULL, -- File size in bytes
    ftp_path VARCHAR(500) NOT NULL, -- Full path on FTP server
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

**Fields:**
- `id`: Unique identifier for each file
- `filename`: System-generated unique filename
- `original_name`: Original filename provided by user
- `mime_type`: File MIME type
- `size`: File size in bytes
- `ftp_path`: Full path to file on FTP server
- `channel_id`: Reference to the channel
- `uploaded_by`: Reference to the user who uploaded
- `created_at`: File upload timestamp
- `updated_at`: Last update timestamp
- `is_active`: File status (active/deleted)

### UserChannels Table (Junction Table)

```sql
CREATE TABLE user_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, channel_id)
);
```

**Fields:**
- `id`: Unique identifier for the assignment
- `user_id`: Reference to the user
- `channel_id`: Reference to the channel
- `assigned_at`: When the user was assigned to the channel
- `assigned_by`: Admin who made the assignment

## Prisma Schema Definition

```prisma
model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email        String   @unique @db.VarChar(255)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  role         Role     @default(CHANNEL_USER)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  lastLoginAt  DateTime? @map("last_login_at")
  isActive     Boolean  @default(true) @map("is_active")
  
  // Relations
  uploadedFiles  File[]         @relation("UploadedFiles")
  assignedUsers  UserChannel[]  @relation("AssignedBy")
  channelAccess  UserChannel[]  @relation("UserAccess")
  
  @@map("users")
}

model Channel {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String   @db.VarChar(100)
  slug        String   @unique @db.VarChar(100)
  description String?  @db.Text
  ftpPath     String   @map("ftp_path") @db.VarChar(255)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  isActive    Boolean  @default(true) @map("is_active")
  
  // Relations
  files          File[]          @relation("ChannelFiles")
  userAccess     UserChannel[]   @relation("ChannelAccess")
  
  @@map("channels")
}

model File {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  filename     String   @db.VarChar(255)
  originalName String   @map("original_name") @db.VarChar(255)
  mimeType     String?  @map("mime_type") @db.VarChar(100)
  size         BigInt
  ftpPath      String   @map("ftp_path") @db.VarChar(500)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  isActive     Boolean  @default(true) @map("is_active")
  
  // Foreign Keys
  channelId String @map("channel_id") @db.Uuid
  uploadedBy String @map("uploaded_by") @db.Uuid
  
  // Relations
  channel   Channel @relation("ChannelFiles", fields: [channelId], references: [id], onDelete: Cascade)
  uploader  User    @relation("UploadedFiles", fields: [uploadedBy], references: [id], onDelete: SetNull)
  
  @@map("files")
}

model UserChannel {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  assignedAt DateTime @default(now()) @map("assigned_at")
  
  // Foreign Keys
  userId    String @map("user_id") @db.Uuid
  channelId String @map("channel_id") @db.Uuid
  assignedBy String? @map("assigned_by") @db.Uuid
  
  // Relations
  user    User    @relation("UserAccess", fields: [userId], references: [id], onDelete: Cascade)
  channel Channel @relation("ChannelAccess", fields: [channelId], references: [id], onDelete: Cascade)
  assigner User?   @relation("AssignedBy", fields: [assignedBy], references: [id], onDelete: SetNull)
  
  @@unique([userId, channelId])
  @@map("user_channels")
}

enum Role {
  ADMIN
  CHANNEL_USER
}
```

## Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_channels_slug ON channels(slug);
CREATE INDEX idx_files_channel_id ON files(channel_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_created_at ON files(created_at);
CREATE INDEX idx_user_channels_user_id ON user_channels(user_id);
CREATE INDEX idx_user_channels_channel_id ON user_channels(channel_id);
```

## Data Seeding Strategy

1. **Default Admin User**: Create an initial admin account during setup
2. **Sample Channels**: Pre-configure common channels (love, jammy, etc.)
3. **Demo Files**: Optional sample files for testing

## Backup and Recovery

- Regular automated backups of the PostgreSQL database
- Point-in-time recovery capability
- Export functionality for channel data
- Audit trail for user actions