# FTP File Manager - System Architecture & Technology Stack

## Technology Stack Recommendation

### Backend
- **Node.js with Express.js**: Modern, lightweight, and excellent for handling file uploads with streams
- **TypeScript**: For type safety and better code maintainability
- **PostgreSQL**: Robust relational database for user/channel management and file metadata
- **Prisma**: Modern ORM for PostgreSQL with excellent TypeScript support
- **basic-ftp**: FTP client library for Node.js with support for large file transfers
- **JWT & bcrypt**: For secure authentication and password hashing
- **Multer with GridFS storage**: For handling large file uploads with streaming capability

### Frontend
- **React with TypeScript**: Modern component-based UI framework
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **React Query**: For server state management and caching
- **React Router**: For client-side routing
- **React Dropzone**: For drag-and-drop file upload interface
- **Axios**: For HTTP client requests

### Infrastructure & Deployment
- **Docker**: Containerized application for consistent deployment
- **Coolify**: For deployment and container management (as per your requirements)
- **Nginx**: Reverse proxy for serving static files and handling large uploads
- **Redis**: For session storage and caching upload progress

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   FTP Server    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Storage)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  PostgreSQL DB  │
                       │   (Metadata)    │
                       └─────────────────┘
```

## Key Features & Components

### 1. Authentication System
- JWT-based authentication for channel users
- Role-based access control (Admin vs Channel User)
- Secure password handling with bcrypt

### 2. File Upload Handling
- Chunked file upload for large files (up to 5GB)
- Progress tracking with WebSocket or Server-Sent Events
- Resumable uploads capability
- File type validation and size limits

### 3. Channel Management
- Each channel has dedicated folder on FTP server
- Channel-specific user accounts
- Admin interface for creating/managing channels

### 4. File Management
- Upload files to channel-specific directories
- Download files from FTP server
- Preview capabilities for common file types
- Delete files with proper permissions

### 5. Admin Interface
- Create and manage channels
- Manage channel user accounts
- Monitor upload activity and storage usage
- System configuration management

## Data Flow

1. **User Login**: Channel users authenticate with credentials
2. **File Upload**: Files are uploaded to backend, processed, and transferred to FTP
3. **File Listing**: Backend fetches file metadata from database and FTP server
4. **File Download**: Backend streams files from FTP server to users
5. **Admin Operations**: Admins manage channels and users through dedicated interface

## Security Considerations

- Input validation and sanitization
- Rate limiting for upload endpoints
- Secure file handling with virus scanning (optional)
- HTTPS enforcement for all communications
- Proper error handling without information leakage

## Scalability Considerations

- Asynchronous file processing with job queues
- Horizontal scaling of backend instances
- Database connection pooling
- Caching frequently accessed file metadata
- CDN integration for static assets

## Development Workflow

1. Backend API development with comprehensive testing
2. Frontend interface development with component testing
3. Integration testing for file upload/download flows
4. Docker containerization
5. Deployment to Coolify with CI/CD pipeline